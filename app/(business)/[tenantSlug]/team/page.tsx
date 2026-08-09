import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getTeamMembers, getTeamInvitations } from "@/features/team/services/team-queries";
import type { TenantRole, TeamPageData } from "@/features/team/types/team";
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

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Team
      </Typography>
      <TeamClientPage tenantSlug={tenantSlug} data={pageData} />
    </Box>
  );
}
