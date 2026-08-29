import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import { requirePortalSession } from "@/features/customer-portal/services/require-portal-session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Customer Portal — Account Page.
 *
 * Shows customer profile info and notification preferences for this tenant.
 */
export default async function PortalAccountPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { session, tenant } = await requirePortalSession(tenantSlug);

  // Load customer details
  const adminClient = createAdminClient();
  const { data: customerRow } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("tenant_customers" as never)
    .select("id, name, email, phone_number, marketing_opt_in, created_at" as never)
    .eq("tenant_id" as never, tenant.id)
    .eq("email" as never, session.normalizedEmail)
    .single();

  const customer = customerRow as unknown as {
    id: string;
    name: string;
    email: string;
    phone_number: string | null;
    marketing_opt_in: boolean;
    created_at: string;
  } | null;

  // Load notification preferences
  type NotifPrefs = { appointment_reminders_enabled: boolean; review_requests_enabled: boolean; waitlist_notifications_enabled: boolean };
  let prefs: NotifPrefs | null = null;
  if (customer) {
    const { data: prefRow } = await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("customer_notification_preferences" as never)
      .select("appointment_reminders_enabled, review_requests_enabled, waitlist_notifications_enabled" as never)
      .eq("tenant_id" as never, tenant.id)
      .eq("tenant_customer_id" as never, customer.id)
      .single();
    prefs = prefRow as unknown as NotifPrefs;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", py: 3, px: { xs: 1.5, sm: 2 } }}>
      <Box sx={{ maxWidth: 600, mx: "auto" }}>
        {/* Header */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={700}>{tenant.name}</Typography>
              <Typography variant="body2" color="text.secondary">My Account</Typography>
            </Box>
            <Button
              component="a"
              href={`/book/${tenantSlug}/portal`}
              variant="outlined"
              size="small"
            >
              Back to Portal
            </Button>
          </Stack>
        </Paper>

        {/* Profile */}
        <Paper elevation={1} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Profile</Typography>
          <Stack spacing={2}>
            <InfoRow label="Name" value={customer?.name ?? "Not set"} />
            <Divider />
            <InfoRow label="Email" value={session.normalizedEmail} />
            <Divider />
            <InfoRow label="Phone" value={customer?.phone_number ?? "Not set"} />
            <Divider />
            <InfoRow
              label="Marketing"
              value={customer?.marketing_opt_in ? "Opted in" : "Opted out"}
              chip={customer?.marketing_opt_in ? { label: "Opted In", color: "success" as const } : { label: "Opted Out", color: "default" as const }}
            />
            <Divider />
            <InfoRow
              label="Customer Since"
              value={customer?.created_at
                ? new Date(customer.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : "Unknown"}
            />
          </Stack>
        </Paper>

        {/* Notification Preferences */}
        <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Notification Preferences</Typography>
          <Stack spacing={2}>
            <InfoRow
              label="Appointment Reminders"
              value={prefs?.appointment_reminders_enabled ? "On" : "Off"}
              chip={{ label: prefs?.appointment_reminders_enabled ? "On" : "Off", color: prefs?.appointment_reminders_enabled ? "success" as const : "default" as const }}
            />
            <Divider />
            <InfoRow
              label="Review Requests"
              value={prefs?.review_requests_enabled ? "On" : "Off"}
              chip={{ label: prefs?.review_requests_enabled ? "On" : "Off", color: prefs?.review_requests_enabled ? "success" as const : "default" as const }}
            />
            <Divider />
            <InfoRow
              label="Waitlist Notifications"
              value={prefs?.waitlist_notifications_enabled ? "On" : "Off"}
              chip={{ label: prefs?.waitlist_notifications_enabled ? "On" : "Off", color: prefs?.waitlist_notifications_enabled ? "success" as const : "default" as const }}
            />
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}

function InfoRow({
  label,
  value,
  chip,
}: {
  label: string;
  value: string;
  chip?: { label: string; color: "success" | "default" | "warning" | "error" };
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {chip ? (
          <Chip label={chip.label} size="small" color={chip.color} sx={{ fontSize: "0.6875rem" }} />
        ) : (
          <Typography variant="body2">{value}</Typography>
        )}
      </Box>
    </Box>
  );
}
