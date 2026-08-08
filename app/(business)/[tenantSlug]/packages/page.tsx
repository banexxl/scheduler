import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getPackages } from "@/features/packages/services/package-queries";
import PackagesClientPage from "./client-page";

export default async function PackagesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  const packages = await getPackages(tenant.id);

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Packages
      </Typography>
      <PackagesClientPage
        tenantSlug={tenantSlug}
        packages={packages}
        canManage={["owner", "admin"].includes(membership.role)}
      />
    </Box>
  );
}
