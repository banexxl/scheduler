import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getTenantPaymentSettings } from "@/features/payments/services/payment-settings-queries";
import { isAppointmentPaymentProviderAvailable } from "@/features/payments/services/resolve-payment-requirement";
import PaymentSettingsClient from "./client-page";

export default async function PaymentSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const settings = await getTenantPaymentSettings(tenant.id);
  const provider = isAppointmentPaymentProviderAvailable();

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component="a" href={`/${tenantSlug}/settings`} variant="body2">
          &larr; Back to Settings
        </Link>
      </Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        Appointment Payments
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure whether online payment is required for bookings. Payments are processed through Polar.
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <PaymentSettingsClient
          tenantSlug={tenantSlug}
          initialSettings={settings ?? {
            tenantId: tenant.id,
            onlinePaymentsEnabled: false,
            defaultPaymentRequirement: "none" as const,
            paymentDeadlineMinutes: 15,
            allowPayLater: true,
          }}
          providerAvailable={provider.available}
        />
      </Paper>
    </Box>
  );
}
