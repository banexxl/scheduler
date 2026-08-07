"use client";

/**
 * Portal Dashboard — Milestone 8.6.
 *
 * Displays customer appointments in tabs: Upcoming, History, Cancelled.
 * Includes logout, book-appointment, and per-appointment actions.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import { logoutPortalAction } from "../actions/logout-portal-action";
import type { CustomerPortalData, CustomerPortalAppointment } from "../types/portal";

type Props = {
  tenantSlug: string;
  tenantName: string;
  appointments: CustomerPortalData;
  timeZone: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Missed",
};

export default function PortalDashboardPage({
  tenantSlug,
  tenantName,
  appointments,
  timeZone,
}: Props) {
  const [tab, setTab] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logoutPortalAction(tenantSlug);
    });
  }

  const tabs = [
    { label: `Upcoming (${appointments.upcoming.length})`, items: appointments.upcoming },
    { label: `History (${appointments.past.length})`, items: appointments.past },
    { label: `Cancelled (${appointments.cancelled.length})`, items: appointments.cancelled },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", py: 3, px: { xs: 1.5, sm: 2 } }}>
      <Box sx={{ maxWidth: 600, mx: "auto" }}>
        {/* Header */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={700}>{tenantName}</Typography>
              <Typography variant="body2" color="text.secondary">My Appointments</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                component="a"
                href={`/book/${tenantSlug}`}
                variant="outlined"
                size="small"
              >
                Book
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={handleLogout}
                disabled={isPending}
              >
                Sign out
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Tabs */}
        <Paper elevation={1} sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: "1px solid", borderColor: "divider" }}
          >
            {tabs.map((t, i) => (
              <Tab key={i} label={t.label} />
            ))}
          </Tabs>

          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {tabs[tab]!.items.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                {tab === 0 ? "No upcoming appointments." :
                 tab === 1 ? "No past appointments." :
                 "No cancelled appointments."}
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {tabs[tab]!.items.map((appt) => (
                  <AppointmentCard
                    key={appt.appointmentNumber}
                    appointment={appt}
                    tenantSlug={tenantSlug}
                    timeZone={timeZone}
                    showActions={tab === 0}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 2 }}>
          Times shown in {timeZone}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Appointment Card ────────────────────────────────────────────────────────

function AppointmentCard({
  appointment,
  tenantSlug,
  timeZone,
  showActions,
}: {
  appointment: CustomerPortalAppointment;
  tenantSlug: string;
  timeZone: string;
  showActions: boolean;
}) {
  const price = parseFloat(appointment.price);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {appointment.serviceName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {appointment.localDate} • {appointment.localStartTime}–{appointment.localEndTime}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {appointment.locationName}
            {appointment.resourceName && ` • ${appointment.resourceName}`}
          </Typography>
        </Box>
        <Stack alignItems="flex-end" spacing={0.5}>
          <Chip
            label={STATUS_LABELS[appointment.status] ?? appointment.status}
            size="small"
            variant="outlined"
            color={
              appointment.status === "confirmed" ? "primary" :
              appointment.status === "completed" ? "success" :
              appointment.status === "cancelled" ? "error" :
              "default"
            }
          />
          {price > 0 && (
            <Typography variant="caption" color="text.secondary">
              {appointment.price} {appointment.currency}
            </Typography>
          )}
        </Stack>
      </Stack>

      {/* Actions */}
      {showActions && (appointment.canCancel || appointment.canReschedule) && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction="row" spacing={1}>
            {appointment.canReschedule && (
              <Button
                component="a"
                href={`/book/${tenantSlug}?service=${encodeURIComponent(appointment.serviceName)}`}
                size="small"
                variant="text"
              >
                Reschedule
              </Button>
            )}
            {appointment.canCancel && (
              <Button size="small" variant="text" color="error">
                Cancel
              </Button>
            )}
          </Stack>
        </>
      )}

      {/* Book Again for past */}
      {!showActions && appointment.status === "completed" && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Button
            component="a"
            href={`/book/${tenantSlug}?service=${encodeURIComponent(appointment.serviceName)}`}
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
