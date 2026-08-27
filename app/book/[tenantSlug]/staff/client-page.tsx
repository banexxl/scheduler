"use client";

/**
 * Staff Client Page — Milestone 17.0.
 *
 * Loads eligible staff based on selected services.
 * Supports "Any Available" option.
 * Redirects to /services if no services selected.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useBooking } from "@/features/booking/hooks/useBooking";
import { getEligibleStaff } from "@/features/booking/actions/booking-data-actions";
import BookingStepper from "@/features/booking/components/BookingStepper";
import StaffCard from "@/features/booking/components/StaffCard";
import BookingEmptyState from "@/features/booking/components/EmptyState";
import type { EligibleStaffMember } from "@/features/booking/types";

type Props = {
  tenantSlug: string;
  tenantId: string;
};

export default function StaffClientPage({ tenantSlug, tenantId }: Props) {
  const router = useRouter();
  const { state, setStaff, hasServices } = useBooking();
  const [staffList, setStaffList] = useState<EligibleStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Redirect if no services selected
  useEffect(() => {
    if (!hasServices) {
      router.replace(`/book/${tenantSlug}/services`);
    }
  }, [hasServices, tenantSlug, router]);

  // Load eligible staff when services change
  useEffect(() => {
    if (!hasServices) return;
    setLoading(true);
    const serviceIds = state.services.map((s) => s.id);
    startTransition(async () => {
      const staff = await getEligibleStaff(tenantId, serviceIds);
      setStaffList(staff);
      setLoading(false);
    });
  }, [tenantId, state.services, hasServices]);

  if (!hasServices) return null;

  const handleSelect = (staffId: string | null) => {
    setStaff(staffId);
  };

  const handleContinue = () => {
    router.push(`/book/${tenantSlug}/locations`);
  };

  return (
    <>
      <BookingStepper activeStep="staff" />

      <Box sx={{ px: { xs: 0, sm: 1 }, pb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Choose Staff
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Select who you&apos;d like to book with, or let us assign the best available.
        </Typography>

        {loading ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : staffList.length === 0 ? (
          <BookingEmptyState
            title="No Staff Available"
            description="No staff members are available for the selected services."
          />
        ) : (
          <Stack spacing={1.5}>
            {/* Any Available option */}
            <StaffCard
              staff={null}
              selected={state.staffId === null}
              onSelect={handleSelect}
            />

            {/* Individual staff */}
            {staffList.map((member) => (
              <StaffCard
                key={member.id}
                staff={member}
                selected={state.staffId === member.id}
                onSelect={handleSelect}
              />
            ))}
          </Stack>
        )}

        {/* Continue button */}
        <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
          <Button
            href={`/book/${tenantSlug}/services`}
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleContinue}
            disabled={loading}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Continue
          </Button>
        </Box>
      </Box>
    </>
  );
}
