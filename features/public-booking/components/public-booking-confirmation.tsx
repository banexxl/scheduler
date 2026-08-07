"use client";

/**
 * Public Booking Confirmation — Milestones 6.11, 8.5.
 *
 * Enhanced confirmation experience with:
 * - Success heading with check icon
 * - Appointment details card
 * - Conditional email notification message
 * - Self-service manage link (when token available)
 * - Book another appointment action
 * - Appointment number emphasized
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import type { PublicBookingConfirmation } from "../types/public-booking";

type Props = {
  confirmation: PublicBookingConfirmation;
  tenantSlug?: string;
};

export default function PublicBookingConfirmationView({ confirmation, tenantSlug }: Props) {
  const price = parseFloat(confirmation.price);

  return (
    <Box sx={{ textAlign: "center" }}>
      {/* Success header */}
      <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main", mb: 0.5 }}>
        Booking Confirmed
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Your appointment has been confirmed.
      </Typography>

      {/* Appointment number */}
      <Paper
        variant="outlined"
        sx={{ p: 1.5, mb: 3, display: "inline-block", borderColor: "success.main" }}
      >
        <Typography variant="subtitle2" color="text.secondary">Appointment #</Typography>
        <Typography variant="h6" fontWeight={700}>{confirmation.appointmentNumber}</Typography>
      </Paper>

      {/* Details card */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, textAlign: "left" }}>
        <Stack spacing={1.25}>
          <DetailRow label="Service" value={confirmation.serviceName} />
          <DetailRow label="Location" value={confirmation.locationName} />
          {confirmation.resourceName && <DetailRow label="With" value={confirmation.resourceName} />}
          <Divider />
          <DetailRow label="Date" value={confirmation.localDate} />
          <DetailRow label="Time" value={`${confirmation.localStartTime} – ${confirmation.localEndTime}`} />
          <DetailRow label="Duration" value={`${confirmation.durationMinutes} min`} />
          {price > 0 && <DetailRow label="Price" value={`${confirmation.price} ${confirmation.currency}`} />}
          <Divider />
          <DetailRow label="Name" value={confirmation.customerName} />
          <DetailRow label="Timezone" value={confirmation.timeZone} />
        </Stack>
      </Paper>

      {/* Custom confirmation message */}
      {confirmation.confirmationMessage && (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
          {confirmation.confirmationMessage}
        </Typography>
      )}

      {/* Email/reminder notice */}
      {confirmation.emailConfirmationEnqueued && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {confirmation.remindersScheduled
            ? "You may receive appointment updates and reminders by email."
            : "A confirmation email will be sent to the address provided."}
        </Typography>
      )}

      {/* Actions */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center" sx={{ mt: 3 }}>
        {tenantSlug && (
          <Button
            component="a"
            href={`/book/${tenantSlug}`}
            variant="outlined"
            size="medium"
          >
            Book another appointment
          </Button>
        )}
      </Stack>

      {/* Save reminder */}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        Please save your appointment number: <strong>{confirmation.appointmentNumber}</strong>
      </Typography>
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value}</Typography>
    </Box>
  );
}
