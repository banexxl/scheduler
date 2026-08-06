import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Divider from "@mui/material/Divider";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getAppointmentById } from "@/features/appointments/services/appointment-queries";
import { APPOINTMENT_STATUS_LABELS } from "@/features/appointments/types/appointment";
import type { AppointmentStatus } from "@/features/appointments/types/appointment";
import AppointmentStatusActions from "@/features/appointments/components/appointment-status-actions";
import {
  getActiveTokenMetadataForAppointment,
  getCustomerActionHistoryForAppointment,
  getTokenHistoryForAppointment,
} from "@/features/appointments/self-service/services/appointment-self-service";
import InternalAppointmentSelfServiceSection from "@/features/appointments/self-service/components/internal-appointment-self-service-section";
import { getNotificationsForAppointment } from "@/features/notifications/services/notification-outbox-service";
import { getRemindersForAppointment } from "@/features/notifications/services/reminder-queries";
import AppointmentNotificationsSection from "@/features/notifications/components/appointment-notifications-section";
import AppointmentRemindersSection from "@/features/notifications/components/appointment-reminders-section";

const EDITABLE_ROLES = ["owner", "admin"];

const STATUS_COLORS: Record<AppointmentStatus, "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info"> = {
  pending: "warning",
  confirmed: "primary",
  checked_in: "info",
  in_progress: "secondary",
  completed: "success",
  cancelled: "error",
  no_show: "default",
};

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; appointmentId: string }>;
}) {
  const { tenantSlug, appointmentId } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const appointment = await getAppointmentById(tenant.id, appointmentId);
  if (!appointment) notFound();

  const [activeToken, tokenHistory, customerActions] = await Promise.all([
    getActiveTokenMetadataForAppointment(tenant.id, appointmentId),
    getTokenHistoryForAppointment(tenant.id, appointmentId, 20),
    getCustomerActionHistoryForAppointment(tenant.id, appointmentId, 100),
  ]);

  // Load notifications and reminders for this appointment (owner/admin only)
  const [notifications, reminders] = canEdit
    ? await Promise.all([
      getNotificationsForAppointment(tenant.id, appointmentId),
      getRemindersForAppointment(tenant.id, appointmentId),
    ])
    : [[], []];

  const price = parseFloat(appointment.price);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component={NextLink} href={`/${tenantSlug}/appointments`} variant="body2">
          &larr; Back to Appointments
        </Link>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            {appointment.appointmentNumber}
          </Typography>
          <Chip
            label={APPOINTMENT_STATUS_LABELS[appointment.status]}
            color={STATUS_COLORS[appointment.status]}
            size="small"
            sx={{ mt: 0.5 }}
          />
        </Box>
        {canEdit && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button component={NextLink} href={`/${tenantSlug}/appointments/${appointmentId}/edit`} variant="outlined" size="small">
              Edit
            </Button>
          </Box>
        )}
      </Box>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Appointment Details</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Date & Time</Typography>
            <Typography>{formatDateTime(appointment.startsAt)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Duration</Typography>
            <Typography>{appointment.durationMinutes} minutes</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Service</Typography>
            <Typography>{appointment.serviceNameSnapshot}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Location</Typography>
            <Typography>{appointment.locationNameSnapshot}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Resource</Typography>
            <Typography>{appointment.resourceNameSnapshot}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Price</Typography>
            <Typography>{price > 0 ? `${appointment.price} ${appointment.currency}` : "Free"}</Typography>
          </Box>
          {(appointment.bufferBeforeMinutes > 0 || appointment.bufferAfterMinutes > 0) && (
            <Box>
              <Typography variant="caption" color="text.secondary">Buffers</Typography>
              <Typography>
                {appointment.bufferBeforeMinutes > 0 ? `${appointment.bufferBeforeMinutes} min before` : ""}
                {appointment.bufferBeforeMinutes > 0 && appointment.bufferAfterMinutes > 0 ? " | " : ""}
                {appointment.bufferAfterMinutes > 0 ? `${appointment.bufferAfterMinutes} min after` : ""}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary">Source</Typography>
            <Typography sx={{ textTransform: "capitalize" }}>{appointment.source.replace("_", " ")}</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Customer</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Name</Typography>
            <Typography>{appointment.customerName}</Typography>
          </Box>
          {appointment.customerEmail && (
            <Box>
              <Typography variant="caption" color="text.secondary">Email</Typography>
              <Typography>{appointment.customerEmail}</Typography>
            </Box>
          )}
          {appointment.customerPhone && (
            <Box>
              <Typography variant="caption" color="text.secondary">Phone</Typography>
              <Typography>{appointment.customerPhone}</Typography>
            </Box>
          )}
        </Box>
        {appointment.customerNotes && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">Customer Notes</Typography>
            <Typography sx={{ whiteSpace: "pre-wrap" }}>{appointment.customerNotes}</Typography>
          </Box>
        )}
      </Paper>

      {appointment.internalNotes && (
        <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Internal Notes</Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{appointment.internalNotes}</Typography>
        </Paper>
      )}

      {appointment.status === "cancelled" && (
        <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
          <Typography variant="h6" gutterBottom color="error">Cancellation</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Cancelled At</Typography>
              <Typography>{appointment.cancelledAt ? formatDateTime(appointment.cancelledAt) : "—"}</Typography>
            </Box>
            {appointment.cancellationReason && (
              <Box>
                <Typography variant="caption" color="text.secondary">Reason</Typography>
                <Typography>{appointment.cancellationReason}</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Audit</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Created</Typography>
            <Typography variant="body2">{formatDateTime(appointment.createdAt)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Last Updated</Typography>
            <Typography variant="body2">{formatDateTime(appointment.updatedAt)}</Typography>
          </Box>
        </Box>
      </Paper>

      {canEdit && (
        <InternalAppointmentSelfServiceSection
          tenantSlug={tenantSlug}
          appointmentId={appointmentId}
          initialActiveToken={activeToken}
          initialTokenHistory={tokenHistory}
          initialCustomerActions={customerActions.map((item) => ({
            id: item.id,
            actionType: item.actionType,
            status: item.status,
            reason: item.reason,
            failureCode: item.failureCode,
            createdAt: item.createdAt,
          }))}
        />
      )}

      {canEdit && (reminders.length > 0 || notifications.length > 0) && (
        <AppointmentRemindersSection
          tenantSlug={tenantSlug}
          appointmentId={appointmentId}
          reminders={reminders}
          canSync={canEdit}
        />
      )}

      {canEdit && notifications.length > 0 && (
        <AppointmentNotificationsSection
          tenantSlug={tenantSlug}
          notifications={notifications}
          canRetry={canEdit}
        />
      )}

      {canEdit && (
        <>
          <Divider sx={{ my: 3 }} />
          <AppointmentStatusActions
            tenantSlug={tenantSlug}
            appointmentId={appointmentId}
            currentStatus={appointment.status}
          />
        </>
      )}
    </Box>
  );
}
