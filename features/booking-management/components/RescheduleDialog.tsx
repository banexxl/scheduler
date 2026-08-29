"use client";

/**
 * Reschedule Dialog — Milestone 18.1.
 *
 * Full-screen dialog with calendar + time slot picker.
 * Reuses existing CalendarPicker and TimeSlotGrid.
 */

import { useState, useEffect, useCallback, useTransition } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import CloseIcon from "@mui/icons-material/Close";
import CalendarPicker from "@/features/availability/components/CalendarPicker";
import MonthNavigator from "@/features/availability/components/MonthNavigator";
import TimeSlotGrid from "@/features/availability/components/TimeSlotGrid";
import EmptyAvailability from "@/features/availability/components/EmptyAvailability";
import {
  getAvailableDays,
  getAvailableTimeSlots,
  type SimplifiedSlot,
} from "@/features/booking/actions/availability-actions";
import { rescheduleBookingAction } from "../actions/modify-booking-actions";
import type { BookingDetails } from "../types";

type Props = {
  open: boolean;
  booking: BookingDetails;
  timeZone: string;
  onClose: () => void;
  onRescheduled: () => void;
};

export default function RescheduleDialog({ open, booking, timeZone, onClose, onRescheduled }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [availableDays, setAvailableDays] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SimplifiedSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SimplifiedSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPendingDays, startDaysTransition] = useTransition();
  const [isPendingSlots, startSlotsTransition] = useTransition();
  const [isPendingConfirm, startConfirmTransition] = useTransition();

  // Load days when month changes
  const loadDays = useCallback(() => {
    if (!open) return;
    const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
    startDaysTransition(async () => {
      const result = await getAvailableDays(
        booking.tenantId,
        booking.location.id,
        [booking.service.id],
        booking.resourceId,
        yearMonth
      );
      if (result.success) setAvailableDays(new Set(result.days));
    });
  }, [open, booking, year, month]);

  useEffect(() => { loadDays(); }, [loadDays]);

  // Load slots when date selected
  useEffect(() => {
    if (!selectedDate || !open) return;
    startSlotsTransition(async () => {
      const result = await getAvailableTimeSlots(
        booking.tenantId,
        booking.location.id,
        [booking.service.id],
        booking.resourceId,
        selectedDate
      );
      if (result.success) setSlots(result.slots);
    });
  }, [selectedDate, open, booking]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
  };

  const handleConfirm = () => {
    if (!selectedSlot || !selectedDate) return;
    setError(null);
    startConfirmTransition(async () => {
      const result = await rescheduleBookingAction(booking, selectedDate, selectedSlot.localStartTime);
      if (result.success) {
        onRescheduled();
      } else {
        setError(result.error);
      }
    });
  };

  const canGoPrevious = !(year === now.getFullYear() && month === now.getMonth() + 1);

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h6">Reschedule Appointment</Typography>
        <IconButton onClick={onClose} aria-label="Close"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose a new date and time. Times shown in {timeZone}.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <MonthNavigator
          year={year}
          month={month}
          onPrevious={() => { if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1); }}
          onNext={() => { if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1); }}
          canGoPrevious={canGoPrevious}
        />

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
            selectedDate={selectedDate}
            todayStr={todayStr}
            onSelectDate={handleDateSelect}
            loading={isPendingDays}
          />
        </Box>

        {selectedDate && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Available Times</Typography>
            {isPendingSlots ? (
              <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress size={24} /></Box>
            ) : slots.length === 0 ? (
              <EmptyAvailability />
            ) : (
              <TimeSlotGrid
                slots={slots}
                selectedStartsAt={selectedSlot?.startsAt ?? null}
                onSelect={setSelectedSlot}
              />
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} disabled={isPendingConfirm}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!selectedSlot || isPendingConfirm}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {isPendingConfirm ? "Rescheduling..." : "Confirm New Time"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
