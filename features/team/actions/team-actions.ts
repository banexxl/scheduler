"use server";

/**
 * Team Management Actions — Milestone 12.1.
 */

import { createHash, randomBytes } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { logger } from "@/lib/logging";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import { revalidatePath } from "next/cache";
import { getEmailProvider } from "@/features/notifications/services/providers";
import type { TenantRole } from "../types/team";

type ActionResult = { success: true } | { success: false; error: string };

const INVITATION_TTL_DAYS = 7;
const TOKEN_BYTES = 32;

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

const PASSWORD_CHARSETS = [
  "ABCDEFGHJKLMNPQRSTUVWXYZ",
  "abcdefghijkmnpqrstuvwxyz",
  "23456789",
  "!@#$%^&*-_=+",
];
const PASSWORD_LENGTH = 16;

/** Generates a random password guaranteed to contain each required character class. */
function generateStrongPassword(): string {
  const allChars = PASSWORD_CHARSETS.join("");
  const randomByte = () => randomBytes(1)[0] as number;
  const pick = (charset: string) => charset[randomByte() % charset.length] as string;

  const required = PASSWORD_CHARSETS.map(pick);
  const rest = Array.from({ length: PASSWORD_LENGTH - required.length }, () => pick(allChars));

  const combined = [...required, ...rest];
  // Fisher-Yates shuffle using CSPRNG bytes so required chars aren't always in fixed positions.
  for (let i = combined.length - 1; i > 0; i -= 1) {
    const j = randomByte() % (i + 1);
    const temp = combined[i] as string;
    combined[i] = combined[j] as string;
    combined[j] = temp;
  }
  return combined.join("");
}

function canInviteRole(actorRole: TenantRole, targetRole: TenantRole): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return ["admin", "manager", "staff"].includes(targetRole);
  return false;
}

// ─── Invite Member ───────────────────────────────────────────────────────────

export async function inviteTenantMemberAction(
  tenantSlug: string,
  input: { email: string; role: TenantRole }
): Promise<ActionResult> {
  try {
    const { user, tenant, membership } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
    const actorRole = membership.role as TenantRole;
    const log = createServerActionLogger({
      action: "team.invite",
      tenantId: tenant.id,
      userId: user.id,
    });

    if (!canInviteRole(actorRole, input.role)) {
      await log.unauthorized("Cannot assign this role");
      return { success: false, error: "You cannot assign this role." };
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return { success: false, error: "Please enter a valid email address." };
    }

    const supabase = createServiceRoleClient();

    // Check existing member
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = (users ?? []).find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from("tenant_members")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("user_id", existingUser.id)
        .eq("status", "active")
        .maybeSingle();

      if (existingMember) {
        return { success: false, error: "This person is already a member of this business." };
      }
    }

    // Create an auth account with a temporary password when the invitee has none yet.
    let temporaryPassword: string | null = null;
    let newAuthUserId: string | null = null;
    if (!existingUser) {
      temporaryPassword = generateStrongPassword();
      const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: temporaryPassword,
        email_confirm: true,
      });

      if (createUserError) {
        return { success: false, error: "Failed to create an account for this email." };
      }
      newAuthUserId = createdUser.user.id;
    }

    // Generate token
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const tokenPrefix = rawToken.slice(0, 10);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60_000).toISOString();

    // Create invitation (unique index prevents duplicate pending)
    const { error: insertError } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
      .from("tenant_member_invitations" as never)
      .insert({
        tenant_id: tenant.id,
        email: normalizedEmail,
        role: input.role,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        status: "pending",
        invited_by: user.id,
        expires_at: expiresAt,
      } as never);

    if (insertError) {
      // Roll back the freshly created auth account so we don't leave a dangling
      // credential that was never delivered to anyone.
      if (newAuthUserId) {
        await supabase.auth.admin.deleteUser(newAuthUserId);
      }
      if ((insertError as { code?: string }).code === "23505") {
        return { success: false, error: "An active invitation already exists for this email." };
      }
      return { success: false, error: "Failed to create invitation." };
    }

    // ─── Send invitation email (best effort — never blocks invitation creation) ──
    const appUrl = process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${rawToken}`;

    console.log("[team.invite] Email env vars:", {
      EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "(not set)",
      SMTP_HOST: process.env.SMTP_HOST ?? "(not set)",
      SMTP_PORT: process.env.SMTP_PORT ?? "(not set)",
      SMTP_USER: process.env.SMTP_USER ?? "(not set)",
      SMTP_PASS: process.env.SMTP_PASS ? "***set***" : "(not set)",
      NOTIFICATION_FROM_EMAIL: process.env.NOTIFICATION_FROM_EMAIL ?? "(not set)",
      PUBLIC_APP_URL: process.env.PUBLIC_APP_URL ?? "(not set)",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "(not set)",
    });
    console.log("[team.invite] Sending invitation email to:", normalizedEmail, "inviteUrl:", inviteUrl);

    try {
      const emailProvider = getEmailProvider();
      const tenantName = tenant.name || tenantSlug;

      const credentialsHtml = temporaryPassword
        ? `
              <div style="margin:0 0 28px;padding:16px 20px;background:#0a0a0f;border:1px solid rgba(124,58,237,0.25);border-radius:10px;text-align:left;">
                <p style="margin:0 0 8px;font-size:12px;color:#8b8b9e;text-transform:uppercase;letter-spacing:0.05em;">Your login credentials</p>
                <p style="margin:0 0 4px;font-size:14px;color:#f0f0f5;">Email: <strong>${normalizedEmail}</strong></p>
                <p style="margin:0;font-size:14px;color:#f0f0f5;">Temporary password: <strong>${temporaryPassword}</strong></p>
              </div>
            `
        : "";
      const credentialsText = temporaryPassword
        ? ` Your login credentials — Email: ${normalizedEmail}, Temporary password: ${temporaryPassword}. Please sign in and change your password afterwards.`
        : "";

      const emailResult = await emailProvider.send({
        to: normalizedEmail,
        subject: `You've been invited to join ${tenantName}`,
        html: `
          <div style="font-family:sans-serif;background:#0a0a0f;padding:40px 16px;">
            <div style="max-width:480px;margin:0 auto;background:#16161e;border:1px solid rgba(124,58,237,0.15);border-radius:16px;padding:40px 32px;text-align:center;">
              <div style="width:60px;height:3px;background:linear-gradient(90deg,#7C3AED,#a855f7);border-radius:2px;margin:0 auto 24px;"></div>
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f0f0f5;">You've been invited</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#8b8b9e;line-height:1.6;">
                You've been invited to join <strong style="color:#f0f0f5;">${tenantName}</strong> as a <strong style="color:#f0f0f5;">${input.role}</strong>. Click below to accept the invitation.
              </p>
              ${credentialsHtml}
              <a href="${inviteUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#a855f7);border-radius:10px;padding:14px 36px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">
                Accept Invitation
              </a>
              <p style="margin:28px 0 0;font-size:12px;color:#5c5c72;line-height:1.5;">
                This invitation expires in ${INVITATION_TTL_DAYS} days. If you weren't expecting this, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
        text: `You've been invited to join ${tenantName} as a ${input.role}.${credentialsText} Accept the invitation: ${inviteUrl}`,
        fromName: tenantName,
        idempotencyKey: `invite_${tokenHash}`,
      });

      console.log("[team.invite] Email provider response:", JSON.stringify(emailResult));
    } catch (emailError) {
      console.error("[team.invite] Email send failed:", emailError instanceof Error ? emailError.message : emailError);
    }

    logger.info("team.invitation.created", {
      tenantId: tenant.id,
      operation: "invite_member",
    });

    revalidatePath(`/${tenantSlug}/team`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to send invitation." };
  }
}

// ─── Revoke Invitation ───────────────────────────────────────────────────────

export async function revokeTenantInvitationAction(
  tenantSlug: string,
  invitationId: string
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
    const supabase = createServiceRoleClient();

    const { error } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
      .from("tenant_member_invitations" as never)
      .update({ status: "revoked", revoked_at: new Date().toISOString() } as never)
      .eq("id" as never, invitationId)
      .eq("tenant_id" as never, tenant.id)
      .eq("status" as never, "pending");

    if (error) return { success: false, error: "Failed to revoke invitation." };

    logger.info("team.invitation.revoked", { tenantId: tenant.id, operation: "revoke_invitation" });
    revalidatePath(`/${tenantSlug}/team`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to revoke invitation." };
  }
}

// ─── Change Member Role ──────────────────────────────────────────────────────

export async function changeTenantMemberRoleAction(
  tenantSlug: string,
  membershipId: string,
  newRole: TenantRole
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
    const actorRole = membership.role as TenantRole;

    // Cannot promote to owner unless actor is owner
    if (newRole === "owner" && actorRole !== "owner") {
      return { success: false, error: "Only owners can assign the owner role." };
    }

    // Cannot change own role
    if (membership.id === membershipId) {
      return { success: false, error: "You cannot change your own role." };
    }

    const supabase = createServiceRoleClient();

    // Load target
    const { data: target } = await supabase
      .from("tenant_members")
      .select("id, role, user_id")
      .eq("id", membershipId)
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .single();

    if (!target) return { success: false, error: "Member not found." };

    // Admin cannot change owner roles
    if (actorRole === "admin" && target.role === "owner") {
      return { success: false, error: "You cannot modify an owner's role." };
    }

    // Last owner protection for demotion
    if (target.role === "owner" && newRole !== "owner") {
      const { count } = await supabase
        .from("tenant_members")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("role", "owner")
        .eq("status", "active");

      if ((count ?? 0) <= 1) {
        return { success: false, error: "Cannot demote the last owner." };
      }
    }

    const { error } = await supabase
      .from("tenant_members")
      .update({ role: newRole })
      .eq("id", membershipId)
      .eq("tenant_id", tenant.id);

    if (error) return { success: false, error: "Failed to update role." };

    logger.info("team.member.role_changed", { tenantId: tenant.id, operation: "change_role" });
    revalidatePath(`/${tenantSlug}/team`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to change role." };
  }
}

// ─── Remove Member ───────────────────────────────────────────────────────────

export async function removeTenantMemberAction(
  tenantSlug: string,
  membershipId: string
): Promise<ActionResult> {
  try {
    const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
    const supabase = createServiceRoleClient();

    const { data: result } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
      .rpc("safe_remove_tenant_member" as never, {
        p_tenant_id: tenant.id,
        p_membership_id: membershipId,
        p_actor_user_id: user.id,
      } as never);

    const rpcResult = (result as unknown as Record<string, unknown>) ?? {};
    const status = String(rpcResult.status ?? "failed");

    if (status === "removed") {
      logger.info("team.member.removed", { tenantId: tenant.id, operation: "remove_member" });
      revalidatePath(`/${tenantSlug}/team`);
      return { success: true };
    }
    if (status === "last_owner") return { success: false, error: "Cannot remove the last owner." };
    if (status === "unauthorized") return { success: false, error: "You cannot remove this member." };
    return { success: false, error: "Failed to remove member." };
  } catch {
    return { success: false, error: "Failed to remove member." };
  }
}
