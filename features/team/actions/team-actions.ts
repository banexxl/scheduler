"use server";

/**
 * Team Management Actions.
 *
 * Invitations use Supabase Auth's native invite flow
 * (`auth.admin.inviteUserByEmail`). Supabase generates and emails the invite
 * token/magic-link; we only carry the invited tenant + role in the user's
 * `app_metadata.pending_tenant_invite`. Acceptance happens in the custom
 * redirect route `/api/auth/accept-invite`, which applies the role via the
 * `accept_pending_tenant_invite` RPC. There is no custom token table.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { logger } from "@/lib/logging";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import { revalidatePath } from "next/cache";
import type { TenantRole, PendingTenantInvite } from "../types/team";
import { PENDING_INVITE_KEY } from "../types/team";

type ActionResult = { success: true } | { success: false; error: string };

function appUrl(): string {
  return process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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

    const pendingInvite: PendingTenantInvite = {
      tenant_id: tenant.id,
      tenant_slug: tenantSlug,
      role: input.role,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
    };

    // Find an existing auth account for this email.
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = (users ?? []).find(u => u.email?.toLowerCase() === normalizedEmail);

    const redirectTo = `${appUrl()}/api/auth/accept-invite`;

    if (existingUser) {
      // Already an active member of THIS tenant?
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

      // Existing account (belongs to another business or is a customer):
      // stamp the pending invite and email a native magic-link that routes
      // through the accept-invite handler so they can join with the chosen role.
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        app_metadata: {
          ...(existingUser.app_metadata ?? {}),
          [PENDING_INVITE_KEY]: pendingInvite,
        },
      });

      if (updateError) {
        return { success: false, error: "Failed to prepare the invitation." };
      }

      const { error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
        options: { redirectTo },
      });

      if (linkError) {
        return { success: false, error: "Failed to send the invitation email." };
      }
    } else {
      // Brand-new invitee: Supabase creates a confirmed-pending user, stores
      // our metadata, and emails the native invite link.
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo,
        data: { [PENDING_INVITE_KEY]: pendingInvite },
      });

      if (inviteError) {
        // 422 => user already exists (race with listUsers); surface a friendly error.
        return { success: false, error: "Failed to send the invitation email." };
      }

      // inviteUserByEmail's `data` populates user_metadata; mirror the invite
      // into app_metadata (server-controlled, not user-editable) for the
      // acceptance handler to trust.
      const { data: { users: refreshed } } = await supabase.auth.admin.listUsers();
      const created = (refreshed ?? []).find(u => u.email?.toLowerCase() === normalizedEmail);
      if (created) {
        await supabase.auth.admin.updateUserById(created.id, {
          app_metadata: {
            ...(created.app_metadata ?? {}),
            [PENDING_INVITE_KEY]: pendingInvite,
          },
        });
      }
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

/**
 * Revokes a pending invitation. The `invitationId` is the invited auth user's
 * id. Clears the pending-invite metadata for this tenant. If the account was
 * created solely for this (never-accepted) invitation and has no membership
 * anywhere, it is deleted.
 */
export async function revokeTenantInvitationAction(
  tenantSlug: string,
  invitationId: string
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
    const supabase = createServiceRoleClient();

    const { data: invitedUserResult } = await supabase.auth.admin.getUserById(invitationId);
    const invitedUser = invitedUserResult?.user;
    if (!invitedUser) return { success: false, error: "Invitation not found." };

    const pending = (invitedUser.app_metadata?.[PENDING_INVITE_KEY] ?? null) as PendingTenantInvite | null;
    if (!pending || pending.tenant_id !== tenant.id) {
      return { success: false, error: "Invitation not found." };
    }

    // Clear the pending invite for this tenant.
    const nextAppMetadata = { ...(invitedUser.app_metadata ?? {}) };
    delete (nextAppMetadata as Record<string, unknown>)[PENDING_INVITE_KEY];

    await supabase.auth.admin.updateUserById(invitedUser.id, {
      app_metadata: nextAppMetadata,
    });

    // If this account has never been confirmed (invite never accepted) and has
    // no tenant membership at all, delete it so it doesn't linger.
    const { count } = await supabase
      .from("tenant_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", invitedUser.id);

    const neverAccepted = !invitedUser.email_confirmed_at && !invitedUser.last_sign_in_at;
    if (neverAccepted && (count ?? 0) === 0) {
      await supabase.auth.admin.deleteUser(invitedUser.id);
    }

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
