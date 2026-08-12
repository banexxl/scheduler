import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getMyDayData } from "@/features/staff/services/get-my-day";
import PageHeader from "@/features/platform/components/page-header";
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
      <Stack spacing={3}>
        <PageHeader
          title="My Day"
          description="Your personal daily schedule."
        />
        <Alert severity="info" sx={{ maxWidth: 500 }}>
          Your account is not linked to a staff profile.
          Ask an owner or administrator to link your account to view your schedule.
        </Alert>
      </Stack>
    );
  }

  return <MyDayClientPage data={data} />;
}
