/**
 * Staff Profile Types — Milestone 12.2.
 */

export type StaffProfileDTO = {
  id: string;
  resourceId: string;
  displayName: string;
  jobTitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isPublic: boolean;
  account: {
    linked: boolean;
    memberId: string | null;
    role: string | null;
    active: boolean;
  } | null;
  services: string[];
  locations: string[];
};

export type PublicStaffDTO = {
  displayName: string;
  jobTitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export type CreateStaffInput = {
  displayName: string;
  jobTitle?: string | null;
  bio?: string | null;
  resourceId?: string | null; // existing resource or create new
  tenantMemberId?: string | null;
};

export type UpdateStaffInput = {
  displayName?: string;
  jobTitle?: string | null;
  bio?: string | null;
  isActive?: boolean;
  isPublic?: boolean;
};

/** Staff profile row enriched with account email and today's schedule summary. */
export type StaffPageRow = StaffProfileDTO & {
  memberEmail: string | null;
  /** null when the viewer's role cannot see schedule data. */
  todayAppointmentCount: number | null;
  upcomingTimeOff: Array<{ startsAt: string; endsAt: string }>;
};

export type UnlinkedResourceOption = { id: string; name: string };
export type LinkableMemberOption = { id: string; email: string; role: string };

export type StaffPageData = {
  rows: StaffPageRow[];
  canManage: boolean;
  canViewSchedule: boolean;
  unlinkedResources: UnlinkedResourceOption[];
  linkableMembers: LinkableMemberOption[];
};
