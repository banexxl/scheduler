"use client";

/**
 * Booking Details Client Page — Milestone 18.0.
 *
 * Loads booking details using the reference + email from sessionStorage.
 * Redirects to lookup page if email is not available.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import BookingDetailsCard from "@/features/booking-management/components/BookingDetailsCard";
import { getBookingDetails } from "@/features/booking-management/actions/booking-management-actions";
import type { BookingDetails } from "@/features/booking-management/types";

type Props = {
  tenantSlug: string;
  reference: string;
};

export default function BookingDetailsClientPage({ tenantSlug, reference }: Props) {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const email = sessionStorage.getItem(`booking-email-${tenantSlug}`);
    if (!email) {
      router.replace(`/book/${tenantSlug}/manage`);
      return;
    }

    startTransition(async () => {
      const result = await getBookingDetails(tenantSlug, reference, email);
      if (result.success) {
        setBooking(result.booking);
      } else {
        setError(result.error);
      }
      setLoaded(true);
    });
  }, [tenantSlug, reference, router]);

  if (!loaded || isPending) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: "center", py: 8, px: 2 }}>
        <Alert severity="error" sx={{ mb: 2, maxWidth: 440, mx: "auto" }}>{error}</Alert>
        <Button href={`/book/${tenantSlug}/manage`} variant="outlined">
          Try Again
        </Button>
      </Box>
    );
  }

  if (!booking) return null;

  return (
    <Box sx={{ py: { xs: 3, sm: 5 }, px: 2, maxWidth: 600, mx: "auto" }}>
      <BookingDetailsCard booking={booking} tenantSlug={tenantSlug} />
    </Box>
  );
}
