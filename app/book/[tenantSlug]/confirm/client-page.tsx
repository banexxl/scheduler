"use client";

/**
 * Confirm Client Page — Milestone 17.2.
 *
 * Reads the booking confirmation from sessionStorage
 * (set by the details page after successful booking creation).
 * Uses useSyncExternalStore pattern to avoid setState-in-effect.
 */

import { useMemo, useSyncExternalStore } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ConfirmationCard from "@/features/booking/components/ConfirmationCard";
import type { BookingConfirmation } from "@/features/booking/types";

type Props = {
  tenantSlug: string;
};

function useSessionConfirmation(tenantSlug: string): BookingConfirmation | null {
  const key = `booking-confirmation-${tenantSlug}`;

  // Subscribe is a no-op since sessionStorage doesn't fire events for same-tab writes
  const subscribe = useMemo(() => () => () => { }, []);

  const getSnapshot = useMemo(
    () => () => {
      if (typeof window === "undefined") return null;
      const stored = sessionStorage.getItem(key);
      if (!stored) return null;
      try {
        const parsed = JSON.parse(stored) as BookingConfirmation;
        sessionStorage.removeItem(key);
        return parsed;
      } catch {
        return null;
      }
    },
    [key]
  );

  const getServerSnapshot = useMemo(() => () => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function ConfirmClientWrapper({ tenantSlug }: Props) {
  const confirmation = useSessionConfirmation(tenantSlug);

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
