"use client";

/**
 * Booking Confirmation Card — Milestone 17.2.
 *
 * Professional confirmation display with booking reference,
 * appointment details, and action buttons.
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import type { BookingConfirmation } from "../types";

type Props = {
  confirmation: BookingConfirmation;
  tenantSlug: string;
};

export default function ConfirmationCard({ confirmation, tenantSlug }: Props) {
  const price = parseFloat(confirmation.price);

  return (
    <Box sx={{ textAlign: "center" }}>
      {/* Success icon */}
      <CheckCircleOutlineIcon sx={{ fontSize: 64, color: "success.main", mb: 1 }} />

      <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main", mb: 0.5 }}>
        Booking Confirmed
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Your appointment has been confirmed.
      </Typography>

      {/* Reference number */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 3, display: "inline-block", borderColor: "success.main" }}>
        <Typography variant="subtitle2" color="text.secondary">Booking Reference</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{confirmation.appointmentNumber}</Typography>
      </Paper>

      {/* Details */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, textAlign: "left" }}>
        <Stack spacing={1.25}>
          <DetailRow label="Business" value={confirmation.tenantName} />
          <DetailRow label="Service" value={confirmation.serviceName} />
          <DetailRow label="Location" value={confirmation.locationName} />
          {confirmation.resourceName && <DetailRow label="Staff" value={confirmation.resourceName} />}
          <Divider />
          <DetailRow label="Date" value={confirmation.localDate} />
          <DetailRow label="Time" value={`${confirmation.localStartTime} \u2013 ${confirmation.localEndTime}`} />
          <DetailRow label="Duration" value={`${confirmation.durationMinutes} min`} />
          {price > 0 && <DetailRow label="Price" value={`${confirmation.currency} ${confirmation.price}`} />}
          <Divider />
          <DetailRow label="Name" value={confirmation.customerName} />
        </Stack>
      </Paper>

      {/* Actions */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
        <Button variant="contained" disabled sx={{ textTransform: "none" }}>
          Add to Calendar (Coming Soon)
        </Button>
        <Button href={`/book/${tenantSlug}`} variant="outlined" sx={{ textTransform: "none" }}>
          Return to Home
        </Button>
      </Stack>
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" sx={{ textAlign: "right" }}>{value}</Typography>
    </Stack>
  );
}
