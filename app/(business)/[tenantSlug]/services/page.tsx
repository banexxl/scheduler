import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import NextLink from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getServices } from "@/features/services/services/get-services";
import ServiceList from "@/features/services/components/service-list";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function ServicesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  let services;
  try { services = await getServices(tenant.id); }
  catch { return <Box><Alert severity="error">Unable to load services.</Alert></Box>; }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>Services</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Link component={NextLink} href={`/${tenantSlug}/services/categories`} variant="body2">Categories</Link>
          {canEdit && <Button component={NextLink} href={`/${tenantSlug}/services/new`} variant="contained">Add Service</Button>}
        </Box>
      </Box>
      <ServiceList services={services} tenantSlug={tenantSlug} canEdit={canEdit} />
    </Box>
  );
}
