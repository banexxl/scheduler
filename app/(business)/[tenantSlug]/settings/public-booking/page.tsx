import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getPublicBookingSettings } from "@/features/public-booking/services/public-tenant-resolver";
import PublicBookingSettingsForm from "@/features/public-booking/components/public-booking-settings-form";

export default async function PublicBookingSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const settings = await getPublicBookingSettings(tenant.id);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component={NextLink} href={`/${tenantSlug}/settings`} variant="body2">
          &larr; Back to Settings
        </Link>
      </Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        Public Booking
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure your public booking page. When enabled, customers can book appointments at:{" "}
        <Typography component="span" variant="body2" fontWeight={600}>
          /book/{tenantSlug}
        </Typography>
      </Typography>

      <PublicBookingSettingsForm
        tenantSlug={tenantSlug}
        initialSettings={settings}
      />
    </Box>
  );
}
