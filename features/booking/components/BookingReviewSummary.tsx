"use client";

/**
 * Booking Review Summary — Milestone 17.2.
 *
 * Displays all booking details for customer review before confirmation.
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import type { BookingState } from "../types";
import { computeTotalDuration, computeTotalPrice } from "../types";

type Props = {
  state: BookingState;
};

export default function BookingReviewSummary({ state }: Props) {
  const { services, date, slot, customer } = state;
  const totalDuration = computeTotalDuration(services);
  const totalPrice = computeTotalPrice(services);

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        {/* Services */}
        <Typography variant="subtitle2" color="text.secondary">Services</Typography>
        {services.map((s) => (
          <Stack key={s.id} direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">{s.name}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={`${s.durationMinutes} min`} size="small" variant="outlined" />
              {parseFloat(s.price) > 0 && (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.currency} {s.price}</Typography>
              )}
            </Stack>
          </Stack>
        ))}

        <Divider />

        {/* Totals */}
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">Total Duration</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{totalDuration} min</Typography>
        </Stack>
        {totalPrice.total > 0 && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Total Price</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{totalPrice.currency} {totalPrice.total.toFixed(2)}</Typography>
          </Stack>
        )}

        <Divider />

        {/* Date & Time */}
        {date && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Date</Typography>
            <Typography variant="body2">{date}</Typography>
          </Stack>
        )}
        {slot && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Time</Typography>
            <Typography variant="body2">{slot.localStartTime} &ndash; {slot.localEndTime}</Typography>
          </Stack>
        )}

        <Divider />

        {/* Customer */}
        {customer && (
          <>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Name</Typography>
              <Typography variant="body2">{customer.firstName} {customer.lastName}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Email</Typography>
              <Typography variant="body2">{customer.email}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Phone</Typography>
              <Typography variant="body2">{customer.phone}</Typography>
            </Stack>
            {customer.notes && (
              <Stack>
                <Typography variant="body2" color="text.secondary">Notes</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{customer.notes}</Typography>
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}
