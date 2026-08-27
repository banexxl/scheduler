"use client";

/**
 * Booking Summary — Milestone 17.0.
 *
 * Sticky bottom bar (mobile) or sidebar summary showing
 * selected services count, total duration, and total price.
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { useBooking } from "../hooks/useBooking";

type Props = {
  continueHref: string;
  continueLabel?: string;
  disabled?: boolean;
};

export default function BookingSummary({
  continueHref,
  continueLabel = "Continue",
  disabled = false,
}: Props) {
  const { hasServices, serviceCount, totalDuration, totalPrice } = useBooking();

  return (
    <Paper
      elevation={4}
      sx={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        p: 2,
        borderRadius: 0,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        zIndex: 10,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ maxWidth: 960, mx: "auto" }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {hasServices && (
            <>
              <Chip
                label={`${serviceCount} service${serviceCount > 1 ? "s" : ""}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                {totalDuration} min
              </Typography>
              {totalPrice.total > 0 && (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {totalPrice.currency} {totalPrice.total.toFixed(2)}
                </Typography>
              )}
            </>
          )}
          {!hasServices && (
            <Typography variant="body2" color="text.secondary">
              Select at least one service
            </Typography>
          )}
        </Stack>

        <Button
          href={continueHref}
          variant="contained"
          disabled={disabled || !hasServices}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {continueLabel}
        </Button>
      </Stack>
    </Paper>
  );
}
