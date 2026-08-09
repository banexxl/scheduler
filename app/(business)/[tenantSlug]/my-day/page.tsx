import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getMyDayData } from "@/features/staff/services/get-my-day";
import MyDayClientPage from "./client-page";

export default async function MyDayPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  const data = await getMyDayData(tenant.id, tenantSlug, membership.id);

  if (!data) {
    return (
      <Box sx={{ maxWidth: 600, mx: "auto", py: 4, px: 2 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          My Day
        </Typography>
        <Alert severity="info">
          Your account is not linked to a staff profile.
          Ask an owner or administrator to link your account.
        </Alert>
      </Box>
    );
  }

  return <MyDayClientPage data={data} />;
}
