import Stack from "@mui/material/Stack";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getWaitlistEntries } from "@/features/waitlist/services/waitlist-queries";
import PageHeader from "@/features/platform/components/page-header";
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
    <Stack spacing={2}>
      <PageHeader
        title="Waitlist"
        description={`${entries.length} entr${entries.length !== 1 ? "ies" : "y"} — customers waiting for available slots`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Waitlist" },
        ]}
      />

      <WaitlistClientPage
        tenantSlug={tenantSlug}
        entries={entries}
        canManage={["owner", "admin", "manager"].includes(membership.role)}
      />
    </Stack>
  );
}
