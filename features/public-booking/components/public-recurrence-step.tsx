"use client";

/**
 * Public Recurrence Step — Milestone 15.12.
 *
 * Customer-friendly interface for setting up recurring appointments.
 * Simplified compared to the staff RecurrenceEditor:
 * - Clearer labels ("Does not repeat", "Weekly", etc.)
 * - Shows generated occurrence dates
 * - Shows recurrence summary
 *
 * Restrictions per Milestone 15.1 policies:
 * - No online prepayment across series
 * - No package-funded series
 * - No gift-card-funded series
 */

import { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { RecurrenceRule, RecurrenceType } from "@/features/recurring-appointments/types/recurrence";
import { MAX_SERIES_OCCURRENCES } from "@/features/recurring-appointments/types/recurrence";
import {
  generateRecurringOccurrences,
  formatRecurrenceSummary,
} from "@/features/recurring-appointments/services/generate-occurrences";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PublicRecurrenceSelection = {
  enabled: boolean;
  rule: RecurrenceRule | null;
  occurrenceDates: string[]; // YYYY-MM-DD list
  summary: string;
};

type Props = {
  selectedDate: string; // YYYY-MM-DD — the first occurrence date
  selectedTime: string; // HH:mm — local start time
  timeZone: string;
  durationMinutes: number;
  onSelect: (recurrence: PublicRecurrenceSelection) => void;
  onBack: () => void;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PublicRecurrenceStep({
  selectedDate,
  selectedTime,
  timeZone,
  durationMinutes,
  onSelect,
  onBack,
}: Props) {
  const [recurrenceType, setRecurrenceType] = useState<"none" | RecurrenceType>("none");
  const [interval, setInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(() => {
    // Default to the selected date's day of week
    const dow = new Date(selectedDate + "T00:00:00").getDay();
    return [dow];
  });
  const [dayOfMonth, setDayOfMonth] = useState(() => {
    const parts = selectedDate.split("-");
    return parseInt(parts[2] ?? "1", 10);
  });
  const [occurrenceCount, setOccurrenceCount] = useState(6);

  // ─── Build rule and generate occurrences ─────────────────────────────

  const rule: RecurrenceRule | null = useMemo(() => {
    if (recurrenceType === "none") return null;

    return {
      type: recurrenceType,
      interval,
      daysOfWeek: recurrenceType === "weekly" ? daysOfWeek : undefined,
      dayOfMonth: recurrenceType === "monthly" ? dayOfMonth : undefined,
      startsOn: selectedDate,
      startsAtLocalTime: selectedTime,
      timezone: timeZone,
      occurrenceCount,
    };
  }, [recurrenceType, interval, daysOfWeek, dayOfMonth, selectedDate, selectedTime, timeZone, occurrenceCount]);

  const occurrences = useMemo(() => {
    if (!rule) return [];
    return generateRecurringOccurrences(rule, durationMinutes);
  }, [rule, durationMinutes]);

  const summary = useMemo(() => {
    if (!rule) return "";
    return formatRecurrenceSummary(rule);
  }, [rule]);

  // ─── Handlers ────────────────────────────────────────────────────────

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(day)) {
        const next = prev.filter((d) => d !== day);
        return next.length === 0 ? [day] : next; // At least one day required
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const handleContinue = () => {
    if (recurrenceType === "none") {
      onSelect({ enabled: false, rule: null, occurrenceDates: [], summary: "" });
    } else {
      onSelect({
        enabled: true,
        rule,
        occurrenceDates: occurrences.map((o) => o.localDate),
        summary,
      });
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Repeat this appointment?</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Set up a recurring schedule for regular appointments.
      </Typography>

      {/* Recurrence type selector */}
      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
        <InputLabel id="recurrence-type-label">Repeat</InputLabel>
        <Select
          labelId="recurrence-type-label"
          value={recurrenceType}
          label="Repeat"
          onChange={(e) => setRecurrenceType(e.target.value as "none" | RecurrenceType)}
        >
          <MenuItem value="none">Does not repeat</MenuItem>
          <MenuItem value="daily">Daily</MenuItem>
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
        </Select>
      </FormControl>

      {recurrenceType !== "none" && (
        <Stack spacing={2}>
          {/* Interval */}
          <TextField
            label={`Every ${recurrenceType === "daily" ? "days" : recurrenceType === "weekly" ? "weeks" : "months"}`}
            type="number"
            size="small"
            fullWidth
            value={interval}
            onChange={(e) => setInterval(Math.max(1, Math.min(12, Number(e.target.value))))}
            inputProps={{ min: 1, max: 12, "aria-label": "Repeat interval" }}
          />

          {/* Weekly: day selection */}
          {recurrenceType === "weekly" && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                On these days
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {DAY_LABELS.map((label, idx) => (
                  <Chip
                    key={idx}
                    label={label}
                    size="small"
                    variant={daysOfWeek.includes(idx) ? "filled" : "outlined"}
                    color={daysOfWeek.includes(idx) ? "primary" : "default"}
                    onClick={() => toggleDay(idx)}
                    sx={{ cursor: "pointer" }}
                    aria-pressed={daysOfWeek.includes(idx)}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Monthly: day of month */}
          {recurrenceType === "monthly" && (
            <TextField
              label="Day of month"
              type="number"
              size="small"
              fullWidth
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value))))}
              inputProps={{ min: 1, max: 31, "aria-label": "Day of month" }}
            />
          )}

          {/* Occurrence count */}
          <TextField
            label="Number of appointments"
            type="number"
            size="small"
            fullWidth
            value={occurrenceCount}
            onChange={(e) => setOccurrenceCount(Math.max(2, Math.min(MAX_SERIES_OCCURRENCES, Number(e.target.value))))}
            inputProps={{ min: 2, max: MAX_SERIES_OCCURRENCES, "aria-label": "Number of appointments" }}
            helperText={`Up to ${MAX_SERIES_OCCURRENCES} appointments`}
          />

          {/* Summary */}
          {summary && (
            <Alert severity="info" variant="outlined" icon={false}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {summary}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {occurrences.length} appointment{occurrences.length !== 1 ? "s" : ""}
                {occurrences.length >= 2 && (
                  <> from {formatDate(occurrences[0]!.localDate)} to {formatDate(occurrences[occurrences.length - 1]!.localDate)}</>
                )}
              </Typography>
            </Alert>
          )}

          {/* Occurrence dates preview */}
          {occurrences.length > 0 && occurrences.length <= 12 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                Scheduled dates
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5}>
                {occurrences.map((occ) => (
                  <Chip key={occ.index} label={formatDate(occ.localDate)} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
          {occurrences.length > 12 && (
            <Typography variant="caption" color="text.secondary">
              {occurrences.length} dates scheduled (first: {formatDate(occurrences[0]!.localDate)}, last: {formatDate(occurrences[occurrences.length - 1]!.localDate)})
            </Typography>
          )}

          {/* Payment restriction notice */}
          <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
            <Typography variant="caption">
              Recurring appointments are pay-at-business only. Online payment, package credits, and gift cards apply to single bookings only.
            </Typography>
          </Alert>
        </Stack>
      )}

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button onClick={onBack} variant="text">Back</Button>
        <Button
          onClick={handleContinue}
          variant="contained"
          disabled={recurrenceType !== "none" && occurrences.length < 2}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
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
