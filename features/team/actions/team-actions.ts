"use server";

/**
 * Team Management Actions — Milestone 12.1.
 */

import { createHash, randomBytes } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { logger } from "@/lib/logging";
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

    if (!canInviteRole(actorRole, input.role)) {
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
      if ((insertError as { code?: string }).code === "23505") {
        return { success: false, error: "An active invitation already exists for this email." };
      }
      return { success: false, error: "Failed to create invitation." };
    }

    // Enqueue invitation email (best effort)
    // TODO: Enqueue via notification outbox with template 'tenant_member_invitation'
    // const appUrl = process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // const inviteUrl = `${appUrl}/invite/${rawToken}`;
    logger.info("team.invitation.created", {
      tenantId: tenant.id,
      operation: "invite_member",
    });

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
      return { success: true };
    }
    if (status === "last_owner") return { success: false, error: "Cannot remove the last owner." };
    if (status === "unauthorized") return { success: false, error: "You cannot remove this member." };
    return { success: false, error: "Failed to remove member." };
  } catch {
    return { success: false, error: "Failed to remove member." };
  }
}
