"use client";

/**
 * Locations Client Page — Milestone 17.0.
 *
 * Displays location cards for selection.
 * Auto-selects and shows placeholder when only one location exists.
 * Redirects to /services if no services selected.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { useBooking } from "@/features/booking/hooks/useBooking";
import BookingStepper from "@/features/booking/components/BookingStepper";
import LocationCard from "@/features/booking/components/LocationCard";
import BookingEmptyState from "@/features/booking/components/EmptyState";
import type { BookingLocation } from "@/features/booking/types";

type Props = {
  tenantSlug: string;
  locations: BookingLocation[];
};

export default function LocationsClientPage({ tenantSlug, locations }: Props) {
  const router = useRouter();
  const { state, setLocation, hasServices } = useBooking();

  // Redirect if no services selected
  useEffect(() => {
    if (!hasServices) {
      router.replace(`/book/${tenantSlug}/services`);
    }
  }, [hasServices, tenantSlug, router]);

  // Auto-select if only one location
  useEffect(() => {
    if (locations.length === 1 && locations[0]) {
      setLocation(locations[0].id);
    }
  }, [locations, setLocation]);

  if (!hasServices) return null;

  if (locations.length === 0) {
    return (
      <>
        <BookingStepper activeStep="location" />
        <BookingEmptyState
          title="No Locations Available"
          description="This business has no active locations."
        />
      </>
    );
  }

  // Auto-skip message for single location
  if (locations.length === 1) {
    const loc = locations[0];
    return (
      <>
        <BookingStepper activeStep="location" />
        <Box sx={{ px: { xs: 0, sm: 1 }, pb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Location
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Your appointment will be at <strong>{loc?.name}</strong>.
          </Alert>
          {loc && (
            <LocationCard location={loc} selected={true} onSelect={() => {}} />
          )}
          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
            <Button href={`/book/${tenantSlug}/staff`} variant="outlined" sx={{ textTransform: "none" }}>
              Back
            </Button>
            <Button variant="contained" disabled sx={{ textTransform: "none", fontWeight: 600 }}>
              Date &amp; Time (Coming Soon)
            </Button>
          </Box>
        </Box>
      </>
    );
  }

  // Multiple locations — let customer choose
  return (
    <>
      <BookingStepper activeStep="location" />

      <Box sx={{ px: { xs: 0, sm: 1 }, pb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Choose Location
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Select where you&apos;d like your appointment.
        </Typography>

        <Stack spacing={1.5}>
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              selected={state.locationId === loc.id}
              onSelect={setLocation}
            />
          ))}
        </Stack>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
          <Button href={`/book/${tenantSlug}/staff`} variant="outlined" sx={{ textTransform: "none" }}>
            Back
          </Button>
          <Button
            variant="contained"
            disabled={!state.locationId}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Date &amp; Time (Coming Soon)
          </Button>
        </Box>
      </Box>
    </>
  );
}
