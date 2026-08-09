/**
 * Team Management Types — Milestone 12.1.
 */

export type TenantRole = "owner" | "admin" | "manager" | "staff";

export const TENANT_ROLES: TenantRole[] = ["owner", "admin", "manager", "staff"];

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type TeamMemberDTO = {
  id: string;
  displayName: string | null;
  email: string;
  role: TenantRole;
  status: string;
  joinedAt: string;
};

export type TeamInvitationDTO = {
  id: string;
  email: string;
  role: TenantRole;
  status: InvitationStatus;
  invitedAt: string;
  expiresAt: string;
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
