import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { resolveNotificationSettings } from "@/features/notifications/services/notification-settings-service";
import { isEmailProviderConfigured, getEmailProviderName } from "@/features/notifications/services/providers";
import NotificationSettingsForm from "@/features/notifications/components/notification-settings-form";

export default async function NotificationSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const settings = await resolveNotificationSettings(tenant.id, tenant.name);
  const providerConfigured = isEmailProviderConfigured();
  const providerName = getEmailProviderName();

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component={NextLink} href={`/${tenantSlug}/settings`} variant="body2">
          &larr; Back to Settings
        </Link>
      </Box>

      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        Notifications
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure email notification preferences for appointment confirmations,
        rescheduling, and cancellations.
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <NotificationSettingsForm
          tenantSlug={tenantSlug}
          initialSettings={settings}
          providerConfigured={providerConfigured}
          providerName={providerName}
        />
      </Paper>
    </Box>
  );
}
