"use client";

/**
 * Details Client Page — Milestone 17.2.
 *
 * Customer details form + booking review summary.
 * On submit, navigates to confirmation after creating the booking.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useBooking } from "@/features/booking/hooks/useBooking";
import BookingStepper from "@/features/booking/components/BookingStepper";
import CustomerForm from "@/features/booking/components/CustomerForm";
import BookingReviewSummary from "@/features/booking/components/BookingReviewSummary";
import { confirmBookingAction } from "@/features/booking/actions/confirm-booking-action";
import type { CustomerInfo } from "@/features/booking/types";

type Props = {
  tenantSlug: string;
  tenantId: string;
};

export default function DetailsClientPage({ tenantSlug, tenantId }: Props) {
  const router = useRouter();
  const { state, setCustomer, hasServices, reset } = useBooking();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showReview, setShowReview] = useState(false);

  // Redirect if prerequisites not met
  useEffect(() => {
    if (!hasServices) {
      router.replace(`/book/${tenantSlug}/services`);
      return;
    }
    if (!state.slot) {
      router.replace(`/book/${tenantSlug}/date-time`);
    }
  }, [hasServices, state.slot, tenantSlug, router]);

  if (!hasServices || !state.slot) return null;

  const handleCustomerSubmit = (values: CustomerInfo) => {
    setCustomer(values);
    setShowReview(true);
  };

  const handleConfirmBooking = () => {
    if (!state.customer || !state.slot || !state.locationId || !state.date) return;
    setError(null);

    startTransition(async () => {
      const result = await confirmBookingAction({
        tenantId,
        tenantSlug,
        services: state.services,
        locationId: state.locationId!,
        staffResourceId: state.staffId,
        date: state.date!,
        slot: state.slot!,
        customer: state.customer!,
      });

      if (result.success) {
        // Store confirmation in sessionStorage for the confirm page
        sessionStorage.setItem(
          `booking-confirmation-${tenantSlug}`,
          JSON.stringify(result.confirmation)
        );
        reset();
        router.push(`/book/${tenantSlug}/confirm`);
      } else {
        setError(result.error);
        if (result.code === "SLOT_TAKEN") {
          // Redirect back to date-time after a short delay
          setTimeout(() => router.push(`/book/${tenantSlug}/date-time`), 3000);
        }
      }
    });
  };

  const initialCustomer: CustomerInfo = state.customer ?? {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  };

  return (
    <>
      <BookingStepper activeStep={showReview ? "confirm" : "details"} />

      <Box sx={{ px: { xs: 0, sm: 1 }, pb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            {error.includes("just booked") && (
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                Redirecting to select a new time...
              </Typography>
            )}
          </Alert>
        )}

        {!showReview ? (
          <CustomerForm
            initialValues={initialCustomer}
            onSubmit={handleCustomerSubmit}
            onBack={() => router.push(`/book/${tenantSlug}/date-time`)}
            submitting={isPending}
          />
        ) : (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Review Your Booking
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please review the details below before confirming.
            </Typography>

            <BookingReviewSummary state={state} />

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
              <Button
                onClick={() => setShowReview(false)}
                variant="outlined"
                disabled={isPending}
                sx={{ textTransform: "none" }}
              >
                Edit Details
              </Button>
              <Button
                onClick={handleConfirmBooking}
                variant="contained"
                disabled={isPending}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {isPending ? "Confirming..." : "Confirm Booking"}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
}
