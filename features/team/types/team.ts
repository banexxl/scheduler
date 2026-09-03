/**
 * Team Management Types — Milestone 12.1.
 */

export type TenantRole = "owner" | "admin" | "manager" | "staff";

export const TENANT_ROLES: TenantRole[] = ["owner", "admin", "manager", "staff"];

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

/**
 * Key under which a pending team invitation is stored on the invited auth
 * user's `app_metadata`. Supabase Auth owns the invite token/email; this
 * metadata carries only the tenant + role to apply on acceptance.
 */
export const PENDING_INVITE_KEY = "pending_tenant_invite";

/** Shape stored on the invited auth user's `app_metadata[PENDING_INVITE_KEY]`. */
export type PendingTenantInvite = {
  tenant_id: string;
  tenant_slug: string;
  role: TenantRole;
  invited_by: string;
  invited_at: string;
};

export type TeamMemberDTO = {
  id: string;
  displayName: string | null;
  email: string;
  role: TenantRole;
  status: string;
  joinedAt: string;
};

export type TeamInvitationDTO = {
  /** Invited auth user id (used to revoke the pending invitation). */
  id: string;
  email: string;
  role: TenantRole;
  status: InvitationStatus;
  invitedAt: string;
};

export type InviteMemberInput = {
  email: string;
  role: TenantRole;
};

export type TeamPageData = {
  members: TeamMemberDTO[];
  invitations: TeamInvitationDTO[];
  currentMemberRole: TenantRole;
  currentMemberId: string;
};
