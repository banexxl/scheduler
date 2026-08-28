"use client";

/**
 * Confirm Client Page — Milestone 17.2.
 *
 * Reads the booking confirmation from sessionStorage
 * (set by the details page after successful booking creation).
 */

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ConfirmationCard from "@/features/booking/components/ConfirmationCard";
import type { BookingConfirmation } from "@/features/booking/types";

type Props = {
  tenantSlug: string;
};

export default function ConfirmClientWrapper({ tenantSlug }: Props) {
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const key = `booking-confirmation-${tenantSlug}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      try {
        setConfirmation(JSON.parse(stored) as BookingConfirmation);
      } catch {
        // Invalid data
      }
      sessionStorage.removeItem(key);
    }
    setLoaded(true);
  }, [tenantSlug]);

  if (!loaded) return null;

  if (!confirmation) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>No Booking Found</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          The booking confirmation has expired or is no longer available.
        </Typography>
        <Button href={`/book/${tenantSlug}`} variant="outlined">
          Return to Home
        </Button>
      </Box>
    );
  }

  return <ConfirmationCard confirmation={confirmation} tenantSlug={tenantSlug} />;
}
