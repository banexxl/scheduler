import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getWaitlistEntries } from "@/features/waitlist/services/waitlist-queries";
import WaitlistClientPage from "./client-page";

export default async function WaitlistPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  const entries = await getWaitlistEntries(tenant.id);

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Waitlist
      </Typography>
      <WaitlistClientPage
        tenantSlug={tenantSlug}
        entries={entries}
        canManage={["owner", "admin", "manager"].includes(membership.role)}
      />
    </Box>
  );
}
