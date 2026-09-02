import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getStaffProfiles } from "@/features/staff/services/staff-queries";
import { getStaffScheduleOverview } from "@/features/staff/services/staff-schedule-queries";
import { getBusinessResources } from "@/features/resources/services/get-business-resources";
import { getTeamMembers } from "@/features/team/services/team-queries";
import PageHeader from "@/features/platform/components/page-header";
import StaffClientPage from "./client-page";
import type { StaffPageData, StaffPageRow } from "@/features/staff/types/staff";

const MANAGE_ROLES = ["owner", "admin"];
const SCHEDULE_VIEW_ROLES = ["owner", "admin", "manager"];

/**
 * Staff Page — Milestone 15.4.
 *
 * Shows bookable staff profiles (distinct from team membership).
 */
export default async function StaffPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canManage = MANAGE_ROLES.includes(membership.role);
  const canViewSchedule = SCHEDULE_VIEW_ROLES.includes(membership.role);

  const [profiles, scheduleOverview, resources, members] = await Promise.all([
    getStaffProfiles(tenant.id),
    canViewSchedule ? getStaffScheduleOverview(tenant.id, 50, 0) : Promise.resolve([]),
    canManage ? getBusinessResources(tenant.id) : Promise.resolve([]),
    canManage ? getTeamMembers(tenant.id) : Promise.resolve([]),
  ]);

  const scheduleByResource = new Map(scheduleOverview.map((s) => [s.resourceId, s]));
  const emailByMemberId = new Map(members.map((m) => [m.id, m.email]));

  const rows: StaffPageRow[] = profiles.map((profile) => {
    const schedule = scheduleByResource.get(profile.resourceId);
    return {
      ...profile,
      memberEmail: profile.account?.memberId ? emailByMemberId.get(profile.account.memberId) ?? null : null,
      todayAppointmentCount: canViewSchedule ? schedule?.todayAppointmentCount ?? 0 : null,
      upcomingTimeOff: schedule?.upcomingTimeOff ?? [],
    };
  });

  const linkedResourceIds = new Set(profiles.map((p) => p.resourceId));
  const linkedMemberIds = new Set(profiles.map((p) => p.account?.memberId).filter((id): id is string => Boolean(id)));

  const pageData: StaffPageData = {
    rows,
    canManage,
    canViewSchedule,
    unlinkedResources: resources
      .filter((r) => r.isActive && !linkedResourceIds.has(r.id))
      .map((r) => ({ id: r.id, name: r.name })),
    linkableMembers: members
      .filter((m) => !linkedMemberIds.has(m.id))
      .map((m) => ({ id: m.id, email: m.email, role: m.role })),
  };

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Staff"
        description={`${rows.length} staff profile${rows.length !== 1 ? "s" : ""} — bookable people linked to resources`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Staff" },
        ]}
        action={
          canManage ? (
            <Button href={`/${tenantSlug}/team`} variant="outlined" size="small">
              Manage Team
            </Button>
          ) : undefined
        }
      />

      <StaffClientPage tenantSlug={tenantSlug} data={pageData} />
    </Stack>
  );
}
