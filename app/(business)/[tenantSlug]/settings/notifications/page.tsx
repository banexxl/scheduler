import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { resolveNotificationSettings } from "@/features/notifications/services/notification-settings-service";
import { isEmailProviderConfigured, getEmailProviderName } from "@/features/notifications/services/providers";
import { getReminderRules, rulesToListItems } from "@/features/notifications/services/reminder-rule-service";
import NotificationSettingsForm from "@/features/notifications/components/notification-settings-form";
import ReminderRulesSection from "@/features/notifications/components/reminder-rules-section";

export default async function NotificationSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const [settings, reminderRules] = await Promise.all([
    resolveNotificationSettings(tenant.id, tenant.name),
    getReminderRules(tenant.id),
  ]);
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
        rescheduling, cancellations, and reminders.
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
        <NotificationSettingsForm
          tenantSlug={tenantSlug}
          initialSettings={settings}
          providerConfigured={providerConfigured}
          providerName={providerName}
        />
      </Paper>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
        <ReminderRulesSection
          tenantSlug={tenantSlug}
          rules={rulesToListItems(reminderRules)}
        />
      </Paper>

      <Box sx={{ mt: 2 }}>
        <Link component={NextLink} href={`/${tenantSlug}/settings/notifications/templates`} variant="body2">
          Manage email templates &rarr;
        </Link>
      </Box>
    </Box>
  );
}
