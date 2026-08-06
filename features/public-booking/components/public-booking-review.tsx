"use client";

import { useState, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import { createPublicBookingAction } from "../actions/create-public-booking-action";
import type {
  PublicBookableService,
  PublicAvailabilityOption,
  PublicBookingSettings,
  PublicBookingConfirmation,
} from "../types/public-booking";

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

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    const result = await createPublicBookingAction(tenantSlug, {
      serviceId: service.id,
      locationId,
      resourceId,
      startsAt: option.startsAt,
      localDate: option.startsAt.slice(0, 10), // Will be recalculated server-side
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || null,
      customerPhone: customerPhone.trim() || null,
      customerNotes: customerNotes.trim() || null,
      idempotencyKey: idempotencyKeyRef.current,
      reviewedPrice: price,
      reviewedDuration: duration,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      // Generate new idempotency key for retry if slot was taken
      if (result.code === "SLOT_TAKEN" || result.code === "DETAILS_CHANGED") {
        idempotencyKeyRef.current = crypto.randomUUID();
      }
      return;
    }

    onConfirm(result.data);
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Review your booking</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
        <ReviewRow label="Service" value={service.name} />
        <ReviewRow label="Date & Time" value={`${option.localStartTime}–${option.localEndTime}`} />
        <ReviewRow label="Duration" value={`${duration} min`} />
        {settings.showResourceNames && resourceName && <ReviewRow label="With" value={resourceName} />}
        {settings.showServicePrices && parseFloat(price) > 0 && <ReviewRow label="Price" value={`${price} ${currency}`} />}
        <ReviewRow label="Timezone" value={timeZone} />
        <Divider sx={{ my: 1 }} />
        <ReviewRow label="Name" value={customerName} />
        {customerEmail && <ReviewRow label="Email" value={customerEmail} />}
        {customerPhone && <ReviewRow label="Phone" value={customerPhone} />}
      </Box>

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        Availability will be checked again when you confirm.
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Box>
  );
}
