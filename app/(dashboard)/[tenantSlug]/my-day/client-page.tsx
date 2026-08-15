"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import type { MyDayDTO } from "@/features/staff/types/my-day";

type Props = { data: MyDayDTO };

export default function MyDayClientPage({ data }: Props) {
  const { staff, workingHours, timeOff, summary, nextAppointment, appointments, gaps } = data;

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 0 } }}>
      {/* Header */}
      <Typography variant="h5" fontWeight={700} gutterBottom>
        My Day
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {staff.displayName}{staff.jobTitle ? ` — ${staff.jobTitle}` : ""}
      </Typography>

      {/* Time Off Banner */}
      {timeOff.active && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You are currently marked unavailable.
        </Alert>
      )}

      {/* Working Hours */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Working today
        </Typography>
        {workingHours.length === 0 ? (
          <Typography variant="body2">Not scheduled to work today</Typography>
        ) : (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {workingHours.map((period, i) => (
              <Chip key={i} label={`${period.startTime} – ${period.endTime}`} size="small" />
            ))}
          </Stack>
        )}
      </Paper>

      {/* Summary */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        <Chip label={`${summary.total} total`} size="small" variant="outlined" />
        <Chip label={`${summary.upcoming} upcoming`} size="small" color="primary" variant="outlined" />
        {summary.checkedIn > 0 && <Chip label={`${summary.checkedIn} checked in`} size="small" color="info" />}
        {summary.inProgress > 0 && <Chip label={`${summary.inProgress} in progress`} size="small" color="secondary" />}
        <Chip label={`${summary.completed} completed`} size="small" color="success" variant="outlined" />
      </Stack>

      {/* Next Appointment */}
      {nextAppointment && (
        <Paper elevation={2} sx={{ p: 2.5, mb: 2, borderLeft: "4px solid", borderColor: "primary.main" }}>
          <Typography variant="caption" color="text.secondary">Next appointment</Typography>
          <Typography variant="h6" fontWeight={600}>
            {nextAppointment.startsAt.slice(11, 16)} — {nextAppointment.serviceName}
          </Typography>
          <Typography variant="body2">
            {nextAppointment.customer.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {nextAppointment.locationName}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            {nextAppointment.canCheckIn && <Button size="small" variant="contained">Check In</Button>}
            {nextAppointment.canStart && <Button size="small" variant="contained" color="secondary">Start</Button>}
            {nextAppointment.canComplete && <Button size="small" variant="contained" color="success">Complete</Button>}
          </Stack>
        </Paper>
      )}

      {!nextAppointment && summary.upcoming === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>No more appointments today.</Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Appointment List */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Today&apos;s Appointments</Typography>
      {appointments.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No appointments today.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {appointments.map((appt) => (
            <Paper key={appt.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {appt.startsAt.slice(11, 16)} — {appt.serviceName}
                  </Typography>
                  <Typography variant="body2">{appt.customer.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{appt.locationName}</Typography>
                </Box>
                <Chip label={appt.status} size="small" color={
                  appt.status === "completed" ? "success" :
                  appt.status === "cancelled" ? "error" :
                  appt.status === "in_progress" ? "secondary" :
                  appt.status === "checked_in" ? "info" : "default"
                } />
              </Stack>
              {appt.paymentStatus && appt.paymentStatus !== "not_required" && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  Payment: {appt.paymentStatus}
                </Typography>
              )}
              <Button component="a" href={`/${data.tenantSlug}/appointments/${appt.id}`} size="small" sx={{ mt: 1 }}>
                View details
              </Button>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Free Time Gaps */}
      {gaps.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Free Time</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {gaps.map((gap, i) => (
              <Chip key={i} label={`${gap.startTime} – ${gap.endTime} (${gap.durationMinutes}min)`} size="small" variant="outlined" />
            ))}
          </Stack>
        </>
      )}

      {/* Calendar Link */}
      <Box sx={{ mt: 3 }}>
        <Button component="a" href={`/${data.tenantSlug}/calendar?resource=${staff.resourceId}`} variant="outlined" size="small">
          View full calendar
        </Button>
      </Box>
    </Box>
  );
}
