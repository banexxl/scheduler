import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import EventIcon from "@mui/icons-material/Event";
import { requirePortalSession } from "@/features/customer-portal/services/require-portal-session";
import { getCustomerPortalAppointments } from "@/features/customer-portal/services/portal-appointment-queries";
import type { CustomerPortalAppointment } from "@/features/customer-portal/types/portal";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Missed",
};

/**
 * Customer Portal — Full Appointments Page.
 *
 * Shows all appointments (upcoming, past, cancelled) with filters.
 */
export default async function PortalAppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const { session, tenant } = await requirePortalSession(tenantSlug);
  const tab = (sp.tab as "upcoming" | "past" | "cancelled") ?? "upcoming";

  const data = await getCustomerPortalAppointments(
    session.tenantId,
    session.normalizedEmail,
    tenant.defaultTimeZone
  );

  const appointments = tab === "upcoming" ? data.upcoming : tab === "past" ? data.past : data.cancelled;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", py: 3, px: { xs: 1.5, sm: 2 } }}>
      <Box sx={{ maxWidth: 600, mx: "auto" }}>
        {/* Header */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={700}>{tenant.name}</Typography>
              <Typography variant="body2" color="text.secondary">All Appointments</Typography>
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

        {/* Tabs */}
        <Stack direction="row" spacing={0.75} sx={{ mb: 2 }}>
          {(["upcoming", "past", "cancelled"] as const).map((t) => (
            <Chip
              key={t}
              label={`${t.charAt(0).toUpperCase() + t.slice(1)} (${t === "upcoming" ? data.upcoming.length : t === "past" ? data.past.length : data.cancelled.length})`}
              component="a"
              href={`/book/${tenantSlug}/portal/appointments?tab=${t}`}
              clickable
              size="small"
              variant={tab === t ? "filled" : "outlined"}
              color={tab === t ? "primary" : "default"}
            />
          ))}
        </Stack>

        {/* List */}
        <Paper elevation={1} sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {appointments.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <EventIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No {tab} appointments
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {appointments.map((appt) => (
                  <AppointmentCard
                    key={appt.appointmentNumber}
                    appointment={appt}
                    tenantSlug={tenantSlug}
                    showActions={tab === "upcoming"}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 2 }}>
          Times shown in {tenant.defaultTimeZone}
        </Typography>
      </Box>
    </Box>
  );
}

function AppointmentCard({
  appointment,
  tenantSlug,
  showActions,
}: {
  appointment: CustomerPortalAppointment;
  tenantSlug: string;
  showActions: boolean;
}) {
  const price = parseFloat(appointment.price);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={600}>{appointment.serviceName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {appointment.localDate} \u00b7 {appointment.localStartTime}\u2013{appointment.localEndTime}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {appointment.locationName}
            {appointment.resourceName && ` \u00b7 ${appointment.resourceName}`}
          </Typography>
        </Box>
        <Stack alignItems="flex-end" spacing={0.5}>
          <Chip
            label={STATUS_LABELS[appointment.status] ?? appointment.status}
            size="small"
            variant="outlined"
            color={
              appointment.status === "confirmed" ? "primary"
                : appointment.status === "completed" ? "success"
                  : appointment.status === "cancelled" ? "error"
                    : "default"
            }
          />
          {price > 0 && (
            <Typography variant="caption" color="text.secondary">
              {appointment.price} {appointment.currency}
            </Typography>
          )}
        </Stack>
      </Stack>

      {showActions && (appointment.canCancel || appointment.canReschedule) && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction="row" spacing={1}>
            {appointment.canReschedule && (
              <Button
                component="a"
                href={`/book/${tenantSlug}/manage?ref=${appointment.appointmentNumber}`}
                size="small"
                variant="text"
              >
                Reschedule
              </Button>
            )}
            {appointment.canCancel && (
              <Button
                component="a"
                href={`/book/${tenantSlug}/manage?ref=${appointment.appointmentNumber}&action=cancel`}
                size="small"
                variant="text"
                color="error"
              >
                Cancel
              </Button>
            )}
          </Stack>
        </>
      )}

      {!showActions && appointment.status === "completed" && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Button
            component="a"
            href={`/book/${tenantSlug}/services`}
            size="small"
            variant="text"
          >
            Book again
          </Button>
        </>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        #{appointment.appointmentNumber}
      </Typography>
    </Paper>
  );
}
