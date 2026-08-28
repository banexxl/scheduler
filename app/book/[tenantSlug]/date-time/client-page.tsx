"use client";

/**
 * Date & Time Client Page — Milestone 17.1.
 *
 * Monthly calendar with available day indicators + time slot grid.
 * Integrates with BookingProvider for state management.
 * Redirects to /services if prerequisites not met.
 */

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { useBooking } from "@/features/booking/hooks/useBooking";
import BookingStepper from "@/features/booking/components/BookingStepper";
import MonthNavigator from "@/features/availability/components/MonthNavigator";
import CalendarPicker from "@/features/availability/components/CalendarPicker";
import TimeSlotGrid from "@/features/availability/components/TimeSlotGrid";
import EmptyAvailability from "@/features/availability/components/EmptyAvailability";
import {
  getAvailableDays,
  getAvailableTimeSlots,
  type SimplifiedSlot,
} from "@/features/booking/actions/availability-actions";

type Props = {
  tenantSlug: string;
  tenantId: string;
  timeZone: string;
};

export default function DateTimeClientPage({ tenantSlug, tenantId, timeZone }: Props) {
  const router = useRouter();
  const { state, setDate, setSlot, hasServices } = useBooking();

  // Calendar state
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Availability data
  const [availableDays, setAvailableDays] = useState<Set<string>>(new Set());
  const [slots, setSlots] = useState<SimplifiedSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPendingDays, startDaysTransition] = useTransition();
  const [isPendingSlots, startSlotsTransition] = useTransition();

  // Redirect if prerequisites not met
  useEffect(() => {
    if (!hasServices) {
      router.replace(`/book/${tenantSlug}/services`);
      return;
    }
    if (!state.locationId) {
      router.replace(`/book/${tenantSlug}/locations`);
    }
  }, [hasServices, state.locationId, tenantSlug, router]);

  const staffResourceId = state.staffId;

  // Load available days when month changes
  const loadDays = useCallback(() => {
    if (!state.locationId || state.services.length === 0) return;
    const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

    startDaysTransition(async () => {
      const result = await getAvailableDays(
        tenantId,
        state.locationId!,
        state.services.map((s) => s.id),
        staffResourceId,
        yearMonth
      );
      if (result.success) {
        setAvailableDays(new Set(result.days));
      } else {
        setError(result.error);
      }
    });
  }, [tenantId, state.locationId, state.services, staffResourceId, year, month]);

  useEffect(() => {
    loadDays();
  }, [loadDays]);

  // Load time slots when date is selected
  useEffect(() => {
    if (!state.date || !state.locationId || state.services.length === 0) return;

    startSlotsTransition(async () => {
      const result = await getAvailableTimeSlots(
        tenantId,
        state.locationId!,
        state.services.map((s) => s.id),
        staffResourceId,
        state.date!
      );
      if (result.success) {
        setSlots(result.slots);
      } else {
        setError(result.error);
      }
    });
  }, [tenantId, state.locationId, state.services, staffResourceId, state.date]);

  // Month navigation
  const handlePreviousMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  const canGoPrevious = !(year === now.getFullYear() && month === now.getMonth() + 1);

  // Date selection
  const handleDateSelect = (dateStr: string) => {
    setDate(dateStr);
    setSlots([]);
  };

  // Slot selection
  const handleSlotSelect = (slot: SimplifiedSlot) => {
    setSlot({
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      localStartTime: slot.localStartTime,
      localEndTime: slot.localEndTime,
      resourceId: slot.resourceId,
      durationMinutes: slot.durationMinutes,
    });
  };

  if (!hasServices || !state.locationId) return null;

  return (
    <>
      <BookingStepper activeStep="datetime" />

      <Box sx={{ px: { xs: 0, sm: 1 }, pb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Choose Date &amp; Time
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Times shown in {timeZone}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Month navigator */}
        <MonthNavigator
          year={year}
          month={month}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
          canGoPrevious={canGoPrevious}
        />

        {/* Calendar */}
        <Box sx={{ position: "relative", mb: 3 }}>
          {isPendingDays && (
            <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          <CalendarPicker
            year={year}
            month={month}
            availableDays={availableDays}
            selectedDate={state.date}
            todayStr={todayStr}
            onSelectDate={handleDateSelect}
            loading={isPendingDays}
          />
        </Box>

        {/* Time slots */}
        {state.date && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Available Times
            </Typography>

            {isPendingSlots ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : slots.length === 0 ? (
              <EmptyAvailability />
            ) : (
              <TimeSlotGrid
                slots={slots}
                selectedStartsAt={state.slot?.startsAt ?? null}
                onSelect={handleSlotSelect}
              />
            )}
          </Box>
        )}

        {/* Navigation */}
        <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
          <Button
            href={`/book/${tenantSlug}/locations`}
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            disabled={!state.slot}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Details (Coming Soon)
          </Button>
        </Box>
      </Box>
    </>
  );
}
