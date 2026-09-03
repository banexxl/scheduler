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
 * id.
 *
 * Behavior:
 *  - Clears the pending-invite metadata for this tenant.
 *  - Hard-deletes the user's `tenant_members` row(s) for THIS tenant.
 *  - Deletes the `auth.users` account entirely when the user has no membership
 *    in any OTHER tenant (i.e. the account exists only for this business).
 *    If the account belongs to other tenants, it is kept and only removed from
 *    this tenant, so a shared account is never destroyed.
 *
 * Last-owner protection: refuses to revoke the final owner of the tenant.
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

    // Last-owner protection: never revoke the final active owner of this tenant.
    const { data: thisTenantRows } = await supabase
      .from("tenant_members")
      .select("id, role, status")
      .eq("tenant_id", tenant.id)
      .eq("user_id", invitedUser.id);

    const isActiveOwner = (thisTenantRows ?? []).some(
      (r) => r.role === "owner" && r.status === "active"
    );
    if (isActiveOwner) {
      const { count: ownerCount } = await supabase
        .from("tenant_members")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("role", "owner")
        .eq("status", "active");

      if ((ownerCount ?? 0) <= 1) {
        return { success: false, error: "Cannot revoke the last owner of this business." };
      }
    }

    // Clear the pending invite for this tenant (if present).
    const nextAppMetadata = { ...(invitedUser.app_metadata ?? {}) };
    if (PENDING_INVITE_KEY in nextAppMetadata) {
      delete (nextAppMetadata as Record<string, unknown>)[PENDING_INVITE_KEY];
      await supabase.auth.admin.updateUserById(invitedUser.id, {
        app_metadata: nextAppMetadata,
      });
    }

    // Hard-delete this tenant's membership row(s) for the user.
    const { error: deleteMemberError } = await supabase
      .from("tenant_members")
      .delete()
      .eq("tenant_id", tenant.id)
      .eq("user_id", invitedUser.id);

    if (deleteMemberError) {
      return { success: false, error: "Failed to remove the team member." };
    }

    // If the account has no membership in any OTHER tenant, delete the auth
    // user entirely. Otherwise keep the shared account intact.
    const { count: otherMemberships } = await supabase
      .from("tenant_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", invitedUser.id)
      .neq("tenant_id", tenant.id);

    if ((otherMemberships ?? 0) === 0) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(invitedUser.id);
      if (deleteUserError) {
        // Membership is already gone (access revoked); surface a soft warning
        // but treat the revoke as successful.
        logger.error("team.invitation.user_delete_failed", {
          tenantId: tenant.id,
          operation: "revoke_invitation",
        });
      }
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

/**
 * Removes a team member. The `safe_remove_tenant_member` RPC handles
 * authorization + last-owner protection; on approval this HARD-deletes the
 * `tenant_members` row and, when the account has no membership in any OTHER
 * tenant, deletes the `auth.users` account entirely (shared accounts are kept).
 */
export async function removeTenantMemberAction(
  tenantSlug: string,
  membershipId: string
): Promise<ActionResult> {
  try {
    const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
    const supabase = createServiceRoleClient();

    // Resolve the target user id up front (needed for the auth-user cleanup).
    const { data: target } = await supabase
      .from("tenant_members")
      .select("user_id")
      .eq("id", membershipId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    // Authorization + last-owner protection (also soft-deactivates the row).
    const { data: result } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
      .rpc("safe_remove_tenant_member" as never, {
        p_tenant_id: tenant.id,
        p_membership_id: membershipId,
        p_actor_user_id: user.id,
      } as never);

    const rpcResult = (result as unknown as Record<string, unknown>) ?? {};
    const status = String(rpcResult.status ?? "failed");

    if (status !== "removed") {
      if (status === "last_owner") return { success: false, error: "Cannot remove the last owner." };
      if (status === "unauthorized") return { success: false, error: "You cannot remove this member." };
      return { success: false, error: "Failed to remove member." };
    }

    // Hard-delete the membership row now that the RPC approved the removal.
    const { error: deleteMemberError } = await supabase
      .from("tenant_members")
      .delete()
      .eq("id", membershipId)
      .eq("tenant_id", tenant.id);

    if (deleteMemberError) {
      // The RPC already deactivated the row, so access is revoked either way.
      logger.error("team.member.hard_delete_failed", { tenantId: tenant.id, operation: "remove_member" });
    }

    // Delete the auth account when it belongs to no other tenant.
    const targetUserId = (target as { user_id?: string } | null)?.user_id;
    if (targetUserId) {
      const { count: otherMemberships } = await supabase
        .from("tenant_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", targetUserId)
        .neq("tenant_id", tenant.id);

      if ((otherMemberships ?? 0) === 0) {
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(targetUserId);
        if (deleteUserError) {
          logger.error("team.member.user_delete_failed", { tenantId: tenant.id, operation: "remove_member" });
        }
      }
    }

    logger.info("team.member.removed", { tenantId: tenant.id, operation: "remove_member" });
    revalidatePath(`/${tenantSlug}/team`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove member." };
  }
}
