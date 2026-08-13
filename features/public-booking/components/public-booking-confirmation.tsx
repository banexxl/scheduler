"use client";

/**
 * Public Booking Confirmation — Milestones 6.11, 8.5, 15.12.
 *
 * Enhanced confirmation experience with:
 * - Success heading with check icon
 * - Appointment details card
 * - Payment method display (gift card, package, pay at business)
 * - Recurrence summary (for series bookings)
 * - ICS calendar export ("Add to Calendar")
 * - Conditional email notification message
 * - Self-service manage link (when token available)
 * - Book another appointment action
 * - Appointment number emphasized
 */

import { useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import type { PublicBookingConfirmation } from "../types/public-booking";
import { generateIcsContent, downloadIcsFile } from "../utils/generate-ics";

type Props = {
  confirmation: PublicBookingConfirmation;
  tenantSlug?: string;
};

export default function PublicBookingConfirmationView({ confirmation, tenantSlug }: Props) {
  const price = parseFloat(confirmation.price);

  // ─── Calendar Export ─────────────────────────────────────────────────

  const handleAddToCalendar = useCallback(() => {
    if (!confirmation.startsAtUtc || !confirmation.endsAtUtc) return;

    const description = [
      `Service: ${confirmation.serviceName}`,
      `Location: ${confirmation.locationName}`,
      confirmation.resourceName ? `With: ${confirmation.resourceName}` : null,
      `Duration: ${confirmation.durationMinutes} min`,
      confirmation.recurrenceSummary ? `Recurrence: ${confirmation.recurrenceSummary}` : null,
    ].filter(Boolean).join("\n");

    const icsContent = generateIcsContent({
      title: `${confirmation.serviceName} at ${confirmation.tenantName}`,
      startsAtUtc: confirmation.startsAtUtc,
      endsAtUtc: confirmation.endsAtUtc,
      location: confirmation.locationAddress ?? confirmation.locationName,
      description,
      organizerName: confirmation.tenantName,
    });

    const filename = `appointment-${confirmation.appointmentNumber.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    downloadIcsFile(icsContent, filename);
  }, [confirmation]);

  const canExportCalendar = Boolean(confirmation.startsAtUtc && confirmation.endsAtUtc);

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <Box sx={{ textAlign: "center" }}>
      {/* Success header */}
      <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main", mb: 0.5 }}>
        {confirmation.recurrenceSummary ? "Series Confirmed" : "Booking Confirmed"}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {confirmation.recurrenceSummary
          ? "Your recurring appointments have been confirmed."
          : "Your appointment has been confirmed."}
      </Typography>

      {/* Appointment number */}
      <Paper
        variant="outlined"
        sx={{ p: 1.5, mb: 3, display: "inline-block", borderColor: "success.main" }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {confirmation.recurrenceSummary ? "Series #" : "Appointment #"}
        </Typography>
        <Typography variant="h6" fontWeight={700}>{confirmation.appointmentNumber}</Typography>
      </Paper>

      {/* Details card */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, textAlign: "left" }}>
        <Stack spacing={1.25}>
          <DetailRow label="Service" value={confirmation.serviceName} />
          <DetailRow label="Location" value={confirmation.locationName} />
          {confirmation.resourceName && <DetailRow label="With" value={confirmation.resourceName} />}
          <Divider />
          <DetailRow label="Date" value={formatDisplayDate(confirmation.localDate)} />
          <DetailRow label="Time" value={`${confirmation.localStartTime} \u2013 ${confirmation.localEndTime}`} />
          <DetailRow label="Duration" value={`${confirmation.durationMinutes} min`} />
          {price > 0 && <DetailRow label="Price" value={`${confirmation.price} ${confirmation.currency}`} />}

          {/* Payment method */}
          {price > 0 && confirmation.paymentMethod && confirmation.paymentMethod !== "pay_at_business" && (
            <>
              <Divider />
              <PaymentSummary confirmation={confirmation} />
            </>
          )}

          {/* Recurrence summary */}
          {confirmation.recurrenceSummary && (
            <>
              <Divider />
              <DetailRow label="Repeats" value={confirmation.recurrenceSummary} />
              {confirmation.seriesOccurrenceCount && (
                <DetailRow label="Total appointments" value={String(confirmation.seriesOccurrenceCount)} />
              )}
            </>
          )}

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
        {/* Add to Calendar */}
        {canExportCalendar && (
          <Button
            onClick={handleAddToCalendar}
            variant="contained"
            size="medium"
          >
            Add to Calendar
          </Button>
        )}

        {/* Book another */}
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

// ─── Sub-Components ──────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value}</Typography>
    </Box>
  );
}

function PaymentSummary({ confirmation }: { confirmation: PublicBookingConfirmation }) {
  switch (confirmation.paymentMethod) {
    case "gift_card":
      return (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">Payment</Typography>
            <Chip label="Gift card" size="small" color="success" variant="outlined" />
          </Box>
          {confirmation.giftCardAmountApplied && (
            <DetailRow
              label="Applied"
              value={formatMinorAmount(confirmation.giftCardAmountApplied, confirmation.currency)}
            />
          )}
          {confirmation.giftCardCodePrefix && (
            <DetailRow label="Card" value={`${confirmation.giftCardCodePrefix}••••`} />
          )}
        </>
      );

    case "package_credit":
      return (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body2" color="text.secondary">Payment</Typography>
          <Chip
            label={confirmation.packageNameUsed ? `Package: ${confirmation.packageNameUsed}` : "Package credit"}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
      );

    case "online":
      return (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body2" color="text.secondary">Payment</Typography>
          <Chip label="Payment processing" size="small" color="warning" variant="outlined" />
        </Box>
      );

    default:
      return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMinorAmount(minorUnits: number, currency: string): string {
  const major = minorUnits / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

function formatDisplayDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
