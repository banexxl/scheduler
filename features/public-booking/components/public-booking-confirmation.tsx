"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import type { PublicBookingConfirmation } from "../types/public-booking";

type Props = {
  confirmation: PublicBookingConfirmation;
};

export default function PublicBookingConfirmationView({ confirmation }: Props) {
  const price = parseFloat(confirmation.price);

  return (
    <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 }, textAlign: "center" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main", mb: 1 }}>
        Booking Confirmed
      </Typography>

      <Typography variant="body1" sx={{ mb: 2 }}>
        Your appointment has been confirmed.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, textAlign: "left" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <DetailRow label="Appointment" value={confirmation.appointmentNumber} />
          <DetailRow label="Service" value={confirmation.serviceName} />
          <DetailRow label="Location" value={confirmation.locationName} />
          {confirmation.resourceName && <DetailRow label="With" value={confirmation.resourceName} />}
          <DetailRow label="Date" value={confirmation.localDate} />
          <DetailRow label="Time" value={`${confirmation.localStartTime}–${confirmation.localEndTime}`} />
          <DetailRow label="Duration" value={`${confirmation.durationMinutes} min`} />
          {price > 0 && <DetailRow label="Price" value={`${confirmation.price} ${confirmation.currency}`} />}
          <DetailRow label="Name" value={confirmation.customerName} />
          <DetailRow label="Timezone" value={confirmation.timeZone} />
        </Box>
      </Paper>

      {confirmation.confirmationMessage && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {confirmation.confirmationMessage}
          </Typography>
        </>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, fontWeight: 500 }}>
        Please save your appointment number: {confirmation.appointmentNumber}
      </Typography>

      {confirmation.emailConfirmationEnqueued && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {confirmation.remindersScheduled
            ? "You may receive appointment updates and reminders by email."
            : "A confirmation email will be sent to the address provided."}
        </Typography>
      )}
    </Paper>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value}</Typography>
    </Box>
  );
}
