import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getPublicBookingSettings } from "@/features/public-booking/services/public-tenant-resolver";
import PublicBookingSettingsForm from "@/features/public-booking/components/public-booking-settings-form";
import BookingLinkPreview from "@/features/public-booking/components/booking-link-preview";
import { hasFeature, resolveBillingState } from "@/features/billing/services/tenant-entitlements";
import { createClient } from "@/lib/supabase/server";

export default async function PublicBookingSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const supabase = await createClient();
  const [settings, subscriptionResult] = await Promise.all([
    getPublicBookingSettings(tenant.id),
    supabase
      .from("tenant_subscriptions" as never)
      .select("status, access_state" as never)
      .eq("tenant_id" as never, tenant.id)
      .maybeSingle(),
  ]);

  const sub = subscriptionResult.data as { status: string | null; access_state: string | null } | null;
  const billingState = resolveBillingState({
    accessState: sub?.access_state ?? null,
    status: sub?.status ?? null,
  });
  const enabled = hasFeature("public_booking", {
    publicBookingEnabled: billingState === "active" || billingState === "trial" || billingState === "free",
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component="a" href={`/${tenantSlug}/settings`} variant="body2">
          &larr; Back to Settings
        </Link>
      </Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        Public Booking
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Configure your public booking page. When enabled, customers can book appointments at:{" "}
        <Typography component="span" variant="body2" fontWeight={600}>
          /book/{tenantSlug}
        </Typography>
      </Typography>
      <Typography variant="body2" color={enabled ? "text.secondary" : "warning.main"} sx={{ mb: 3 }}>
        {enabled
          ? "Public booking is available for your current plan."
          : "Public booking is currently restricted by your billing state; upgrade to enable it."}
      </Typography>

      <PublicBookingSettingsForm
        tenantSlug={tenantSlug}
        initialSettings={settings}
      />

      <BookingLinkPreview tenantSlug={tenantSlug} isEnabled={settings.isEnabled} />
    </Box>
  );
}
