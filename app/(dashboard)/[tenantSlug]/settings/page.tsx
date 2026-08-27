import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessSettings } from "@/features/business/services/get-business-settings";
import BusinessSettingsForm from "@/features/business/components/business-settings-form";
import DeleteTenantSection from "@/features/business/components/delete-tenant-section";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  const canEdit = EDITABLE_ROLES.includes(membership.role);

  let settings;
  try {
    settings = await getBusinessSettings(tenant.id);
  } catch {
    return <Alert severity="error">Unable to load business settings.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Settings"
        description="Business configuration, billing, and account management."
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Settings" },
        ]}
      />

      {/* Business details */}
      <SectionCard title="Business Details" description="Name, timezone, currency, and contact information.">
        <BusinessSettingsForm
          settings={settings}
          tenantSlug={tenantSlug}
          canEdit={canEdit}
        />
      </SectionCard>

      {/* Settings navigation */}
      <SectionCard title="More Settings">
        <Stack spacing={1.5}>
          <Button
            href={`/${tenantSlug}/settings/billing`}
            variant="outlined"
            size="small"
            sx={{ width: "fit-content" }}
          >
            Billing & Subscription
          </Button>
          <Button
            href={`/${tenantSlug}/settings/booking`}
            variant="outlined"
            size="small"
            sx={{ width: "fit-content" }}
          >
            Booking Rules
          </Button>
          <Button
            href={`/${tenantSlug}/settings/public-booking`}
            variant="outlined"
            size="small"
            sx={{ width: "fit-content" }}
          >
            Public Booking
          </Button>
          <Button
            href={`/${tenantSlug}/settings/notifications`}
            variant="outlined"
            size="small"
            sx={{ width: "fit-content" }}
          >
            Notification Settings
          </Button>
          <Button
            href={`/${tenantSlug}/settings/templates`}
            variant="outlined"
            size="small"
            sx={{ width: "fit-content" }}
          >
            Templates
          </Button>
          <Button
            href={`/${tenantSlug}/settings/payments`}
            variant="outlined"
            size="small"
            sx={{ width: "fit-content" }}
          >
            Payment Settings
          </Button>
        </Stack>
      </SectionCard>

      {/* Danger zone */}
      {membership.role === "owner" && (
        <DeleteTenantSection tenantSlug={tenantSlug} tenantName={settings.name} />
      )}
    </Stack>
  );
}
