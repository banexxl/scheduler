import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";

/**
 * Gift Card Settings — Milestone 15.4.
 */
export default async function GiftCardSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const supabase = createServiceRoleClient();
  const { data: settings } = await supabase
    .from("tenant_gift_card_settings")
    .select("*")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const s = (settings ?? {}) as Record<string, unknown>;

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Gift Cards"
        description="Configure gift card sales and redemption."
        breadcrumbs={[
          { label: "Settings", href: `/${tenantSlug}/settings` },
          { label: "Gift Cards" },
        ]}
      />

      <SectionCard title="Status">
        <Typography sx={{ fontSize: "0.875rem" }}>
          Gift cards are currently: <strong>{s.enabled ? "Enabled" : "Disabled"}</strong>
        </Typography>
      </SectionCard>

      <SectionCard title="Purchase Options">
        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: "0.8125rem" }}>
            Custom amount: {s.allow_custom_amount ? "Allowed" : "Predefined only"}
          </Typography>
          {s.allow_custom_amount ? (
            <Typography sx={{ fontSize: "0.8125rem", color: "#8b8b9e" }}>
              Range: {String(s.minimum_custom_amount ?? 0)} – {String(s.maximum_custom_amount ?? 0)} (minor units)
            </Typography>
          ) : null}
        </Stack>
      </SectionCard>

      <SectionCard title="Redemption">
        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: "0.8125rem" }}>
            Appointment redemption: {s.allow_appointment_redemption ? "Enabled" : "Disabled"}
          </Typography>
          <Typography sx={{ fontSize: "0.8125rem" }}>
            Package redemption: {s.allow_package_redemption ? "Enabled" : "Disabled"}
          </Typography>
        </Stack>
      </SectionCard>

      <SectionCard title="Expiration">
        <Typography sx={{ fontSize: "0.8125rem" }}>
          {s.expires_after_days ? `Cards expire after ${s.expires_after_days} days` : "No expiration"}
        </Typography>
      </SectionCard>
    </Stack>
  );
}
