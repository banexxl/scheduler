import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getTeamMembers, getTeamInvitations } from "@/features/team/services/team-queries";
import type { TenantRole, TeamPageData } from "@/features/team/types/team";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import TeamClientPage from "./client-page";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  const [members, invitations] = await Promise.all([
    getTeamMembers(tenant.id),
    getTeamInvitations(tenant.id),
  ]);

  const pageData: TeamPageData = {
    members,
    invitations,
    currentMemberRole: membership.role as TenantRole,
    currentMemberId: membership.id,
  };

  const activeMembers = members.filter(m => m.status === "active").length;
  const pendingInvitations = invitations.filter(i => i.status === "pending").length;

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Team"
        description="Manage team members and invitations."
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Team" },
        ]}
      />

      {/* Team summary */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <MetricCard label="Active Members" value={activeMembers} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <MetricCard label="Pending Invitations" value={pendingInvitations} variant={pendingInvitations > 0 ? "info" : "default"} />
        </Grid>
      </Grid>

      <TeamClientPage tenantSlug={tenantSlug} data={pageData} />
    </Stack>
  );
}
