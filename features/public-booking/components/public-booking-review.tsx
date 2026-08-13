"use client";

/**
 * Public Booking Review Step — Milestones 6.11, 15.12.
 *
 * Final review before submission. Shows all booking details including
 * payment method, gift card application, and package credit.
 *
 * Submits to createPublicBookingAction with full payment context.
 */

import { useState, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import { createPublicBookingAction } from "../actions/create-public-booking-action";
import { createPublicSeriesAction } from "../actions/create-public-series-action";
import type {
  PublicBookableService,
  PublicAvailabilityOption,
  PublicBookingSettings,
  PublicBookingConfirmation,
  PublicPaymentMethod,
} from "../types/public-booking";
import type { GiftCardReservation, PackageOption } from "./public-payment-step";
import type { PublicRecurrenceSelection } from "./public-recurrence-step";

type Props = {
  tenantSlug: string;
  tenantName: string;
  service: PublicBookableService;
  locationId: string;
  resourceId: string;
  option: PublicAvailabilityOption;
  timeZone: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
  settings: PublicBookingSettings;
  paymentMethod?: PublicPaymentMethod;
  giftCardReservation?: GiftCardReservation | null;
  packageOption?: PackageOption | null;
  recurrence?: PublicRecurrenceSelection | null;
  onConfirm: (confirmation: PublicBookingConfirmation) => void;
  onBack: () => void;
};

export default function PublicBookingReview({
  tenantSlug,
  service,
  locationId,
  resourceId,
  option,
  timeZone,
  customerName,
  customerEmail,
  customerPhone,
  customerNotes,
  settings,
  paymentMethod = "pay_at_business",
  giftCardReservation,
  packageOption,
  recurrence,
  onConfirm,
  onBack,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const resourceOption = option.resourceOptions.find((r) => r.resourceId === resourceId);
  const price = resourceOption?.price ?? service.price;
  const duration = resourceOption?.durationMinutes ?? service.durationMinutes;
  const currency = resourceOption?.currency ?? service.currency;
  const resourceName = resourceOption?.resourceName;

  const priceMinor = Math.round(parseFloat(price) * 100);

  const isRecurring = recurrence?.enabled === true && recurrence.rule !== null;

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    if (isRecurring && recurrence.rule) {
      // Recurring series creation
      const result = await createPublicSeriesAction(tenantSlug, {
        serviceId: service.id,
        locationId,
        resourceId,
        recurrence: recurrence.rule,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        customerPhone: customerPhone.trim() || null,
        customerNotes: customerNotes.trim() || null,
        idempotencyKey: idempotencyKeyRef.current,
      });

      setSubmitting(false);

      if (!result.success) {
        setError(result.error);
        if (result.code === "SLOT_TAKEN") {
          idempotencyKeyRef.current = crypto.randomUUID();
        }
        return;
      }

      onConfirm(result.data);
    } else {
      // Single appointment creation
      const result = await createPublicBookingAction(tenantSlug, {
        serviceId: service.id,
        locationId,
        resourceId,
        startsAt: option.startsAt,
        localDate: option.startsAt.slice(0, 10),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        customerPhone: customerPhone.trim() || null,
        customerNotes: customerNotes.trim() || null,
        idempotencyKey: idempotencyKeyRef.current,
        reviewedPrice: price,
        reviewedDuration: duration,
        paymentMethod,
        giftCardReservationId: giftCardReservation?.reservationId ?? null,
        packageCustomerPackageId: packageOption?.customerPackageId ?? null,
        packageServiceId: packageOption ? service.id : null,
      });

      setSubmitting(false);

      if (!result.success) {
        setError(result.error);
        if (result.code === "SLOT_TAKEN" || result.code === "DETAILS_CHANGED") {
          idempotencyKeyRef.current = crypto.randomUUID();
        }
        return;
      }

      onConfirm(result.data);
    }
  }

  // Payment method display
  const paymentLabel = getPaymentMethodLabel(paymentMethod, giftCardReservation, packageOption, priceMinor, currency);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Review your booking</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
        <ReviewRow label="Service" value={service.name} />
        <ReviewRow label="Date & Time" value={`${option.localStartTime}\u2013${option.localEndTime}`} />
        <ReviewRow label="Duration" value={`${duration} min`} />
        {settings.showResourceNames && resourceName && <ReviewRow label="With" value={resourceName} />}
        {settings.showServicePrices && parseFloat(price) > 0 && <ReviewRow label="Price" value={`${price} ${currency}`} />}
        <ReviewRow label="Timezone" value={timeZone} />

        {/* Recurrence summary */}
        {isRecurring && recurrence.summary && (
          <>
            <Divider sx={{ my: 1 }} />
            <ReviewRow label="Repeats" value={recurrence.summary} />
            <ReviewRow label="Appointments" value={String(recurrence.occurrenceDates.length)} />
            {recurrence.occurrenceDates.length >= 2 && (
              <ReviewRow
                label="Period"
                value={`${formatShortDate(recurrence.occurrenceDates[0] ?? "")} \u2013 ${formatShortDate(recurrence.occurrenceDates[recurrence.occurrenceDates.length - 1] ?? "")}`}
              />
            )}
          </>
        )}

        <Divider sx={{ my: 1 }} />
        <ReviewRow label="Name" value={customerName} />
        {customerEmail && <ReviewRow label="Email" value={customerEmail} />}
        {customerPhone && <ReviewRow label="Phone" value={customerPhone} />}
        {customerNotes && <ReviewRow label="Notes" value={customerNotes} />}

        {/* Payment details */}
        {parseFloat(price) > 0 && !isRecurring && (
          <>
            <Divider sx={{ my: 1 }} />
            <ReviewRow label="Payment" value={paymentLabel} />
            {giftCardReservation && (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Gift card</Typography>
                <Chip
                  label={`${giftCardReservation.codePrefix}•••• — ${formatMinorAmount(giftCardReservation.reservedAmount, giftCardReservation.currency)}`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Box>
            )}
            {giftCardReservation && giftCardReservation.reservedAmount < priceMinor && (
              <ReviewRow
                label="Remaining"
                value={`${formatMinorAmount(priceMinor - giftCardReservation.reservedAmount, currency)} at business`}
              />
            )}
            {packageOption && (
              <ReviewRow label="Package" value={`${packageOption.packageName} (${packageOption.creditsRequired} credit)`} />
            )}
          </>
        )}
      </Box>

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        {isRecurring
          ? "All occurrence dates will be checked for conflicts."
          : "Availability will be checked again when you confirm."}
      </Alert>

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button onClick={onBack} disabled={submitting} variant="text">Back</Button>
        <Button onClick={handleConfirm} disabled={submitting} variant="contained">
          {submitting ? <CircularProgress size={20} /> : "Confirm Booking"}
        </Button>
      </Box>
    </Box>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Box>
  );
}

function getPaymentMethodLabel(
  method: PublicPaymentMethod,
  giftCard: GiftCardReservation | null | undefined,
  pkg: PackageOption | null | undefined,
  priceMinor: number,
  currency: string,
): string {
  switch (method) {
    case "gift_card":
      if (giftCard && giftCard.reservedAmount >= priceMinor) return "Gift card (fully covered)";
      return "Gift card + pay at business";
    case "package_credit":
      return pkg ? `Package credit (${pkg.packageName})` : "Package credit";
    case "online":
      return `Pay online (${formatMinorAmount(priceMinor, currency)})`;
    case "pay_at_business":
    default:
      return "Pay at business";
  }
}

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

function formatShortDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
