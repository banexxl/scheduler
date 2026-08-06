"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import { ALL_DAYS, DAY_LABELS } from "@/lib/scheduling/scheduling-constants";
import type { DayOfWeek } from "@/lib/scheduling/scheduling-constants";
import type { LocationBusinessHour, LocationBusinessHourInput } from "../types/location-business-hour";

type LocationWeeklyHoursEditorProps = {
  initialSchedule: LocationBusinessHour[];
  onSave: (periods: LocationBusinessHourInput[]) => Promise<{ success: boolean; message?: string }>;
  canEdit: boolean;
};

type PeriodState = {
  key: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

let keyCounter = 0;
function nextKey() { return `lbh_${++keyCounter}`; }

function initPeriods(schedule: LocationBusinessHour[]): PeriodState[] {
  return schedule.map((h) => ({
    key: nextKey(),
    dayOfWeek: h.dayOfWeek,
    startTime: h.startTime,
    endTime: h.endTime,
    isActive: h.isActive,
  }));
}

export default function LocationWeeklyHoursEditor({
  initialSchedule,
  onSave,
  canEdit,
}: LocationWeeklyHoursEditorProps) {
  const [periods, setPeriods] = useState<PeriodState[]>(() => initPeriods(initialSchedule));
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

  const addPeriod = (day: DayOfWeek) => {
    setPeriods((prev) => [...prev, { key: nextKey(), dayOfWeek: day, startTime: "09:00", endTime: "17:00", isActive: true }]);
  };

  const removePeriod = (key: string) => {
    setPeriods((prev) => prev.filter((p) => p.key !== key));
  };

  const updatePeriod = (key: string, field: keyof PeriodState, value: unknown) => {
    setPeriods((prev) => prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)));
  };

  const handleSave = () => {
    if (!canEdit) return;
    setResult(null);
    startTransition(async () => {
      const payload: LocationBusinessHourInput[] = periods.map((p, idx) => ({
        dayOfWeek: p.dayOfWeek,
        startTime: p.startTime,
        endTime: p.endTime,
        isActive: p.isActive,
        sortOrder: idx,
      }));
      const r = await onSave(payload);
      setResult(r);
    });
  };

  const periodsForDay = (day: DayOfWeek) => periods.filter((p) => p.dayOfWeek === day);

  const isDirty = (() => {
    const current = periods.map((p) => ({ dayOfWeek: p.dayOfWeek, startTime: p.startTime, endTime: p.endTime, isActive: p.isActive }));
    const initial = initPeriods(initialSchedule).map((p) => ({ dayOfWeek: p.dayOfWeek, startTime: p.startTime, endTime: p.endTime, isActive: p.isActive }));
    return JSON.stringify(current) !== JSON.stringify(initial);
  })();

  return (
    <Box>
      {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>You have view-only access.</Alert>}
      {result?.success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setResult(null)}>{result.message}</Alert>}
      {result && !result.success && result.message && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setResult(null)}>{result.message}</Alert>}

      {ALL_DAYS.map((day) => {
        const dayPeriods = periodsForDay(day);
        return (
          <Box key={day} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>{DAY_LABELS[day]}</Typography>
            {dayPeriods.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Closed</Typography>}
            {dayPeriods.map((period) => (
              <Paper key={period.key} variant="outlined" sx={{ p: 1, mb: 0.5, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <TextField label="Start" type="time" size="small" sx={{ width: 120 }} value={period.startTime}
                  onChange={(e) => updatePeriod(period.key, "startTime", e.target.value)} disabled={isPending || !canEdit}
                  slotProps={{ htmlInput: { step: 300 } }} />
                <Typography variant="body2">&mdash;</Typography>
                <TextField label="End" type="time" size="small" sx={{ width: 120 }} value={period.endTime}
                  onChange={(e) => updatePeriod(period.key, "endTime", e.target.value)} disabled={isPending || !canEdit}
                  slotProps={{ htmlInput: { step: 300 } }} />
                {canEdit && (
                  <IconButton size="small" onClick={() => removePeriod(period.key)} disabled={isPending} aria-label="Remove period">&#10005;</IconButton>
                )}
              </Paper>
            ))}
            {canEdit && <Button size="small" onClick={() => addPeriod(day)} disabled={isPending} sx={{ mt: 0.5 }}>+ Add period</Button>}
            <Divider sx={{ mt: 1.5 }} />
          </Box>
        );
      })}

      {canEdit && (
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={handleSave} disabled={isPending || !isDirty}>
            {isPending ? "Saving..." : "Save Business Hours"}
          </Button>
        </Box>
      )}
    </Box>
  );
}
