"use client";

/**
 * Recurrence Editor — Milestone 15.1.
 *
 * Inline form section for configuring recurrence when creating an appointment.
 * Toggle: "Repeat appointment" → shows frequency/interval/days/end controls.
 */

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import type { RecurrenceRule } from "../types/recurrence";
import { MAX_SERIES_OCCURRENCES } from "../types/recurrence";
import { formatRecurrenceSummary } from "../services/generate-occurrences";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  rule: Partial<RecurrenceRule>;
  onRuleChange: (rule: Partial<RecurrenceRule>) => void;
  timezone: string;
};

export default function RecurrenceEditor({
  enabled,
  onEnabledChange,
  rule,
  onRuleChange,
}: Props) {
  const updateRule = <K extends keyof RecurrenceRule>(key: K, value: RecurrenceRule[K]) => {
    onRuleChange({ ...rule, [key]: value });
  };

  const toggleDay = (day: number) => {
    const current = rule.daysOfWeek ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    updateRule("daysOfWeek", next);
  };

  // Build a summary when rule is complete enough
  const canSummarize = enabled && rule.type && rule.startsAtLocalTime && rule.startsOn;
  const summary = canSummarize
    ? formatRecurrenceSummary({
      type: rule.type!,
      interval: rule.interval ?? 1,
      daysOfWeek: rule.daysOfWeek,
      dayOfMonth: rule.dayOfMonth,
      startsOn: rule.startsOn!,
      startsAtLocalTime: rule.startsAtLocalTime!,
      timezone: rule.timezone ?? "UTC",
      occurrenceCount: rule.occurrenceCount,
      endsOn: rule.endsOn,
    })
    : null;

  return (
    <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            size="small"
          />
        }
        label={
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
            Repeat appointment
          </Typography>
        }
      />

      {enabled && (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {/* Frequency */}
          <FormControl size="small" fullWidth>
            <InputLabel>Frequency</InputLabel>
            <Select
              value={rule.type ?? "weekly"}
              label="Frequency"
              onChange={(e) => updateRule("type", e.target.value as RecurrenceRule["type"])}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>

          {/* Interval */}
          <TextField
            label={`Every ${rule.type === "daily" ? "days" : rule.type === "weekly" ? "weeks" : "months"}`}
            type="number"
            size="small"
            value={rule.interval ?? 1}
            onChange={(e) => updateRule("interval", Math.max(1, Math.min(12, Number(e.target.value))))}
            inputProps={{ min: 1, max: 12 }}
          />

          {/* Weekly: day selection */}
          {(rule.type ?? "weekly") === "weekly" && (
            <Box>
              <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", mb: 0.5 }}>
                Days of week
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {DAY_LABELS.map((label, idx) => (
                  <Chip
                    key={idx}
                    label={label}
                    size="small"
                    variant={(rule.daysOfWeek ?? []).includes(idx) ? "filled" : "outlined"}
                    color={(rule.daysOfWeek ?? []).includes(idx) ? "primary" : "default"}
                    onClick={() => toggleDay(idx)}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Monthly: day of month */}
          {rule.type === "monthly" && (
            <TextField
              label="Day of month"
              type="number"
              size="small"
              value={rule.dayOfMonth ?? 1}
              onChange={(e) => updateRule("dayOfMonth", Math.max(1, Math.min(31, Number(e.target.value))))}
              inputProps={{ min: 1, max: 31 }}
            />
          )}

          {/* End condition */}
          <TextField
            label="Number of occurrences"
            type="number"
            size="small"
            value={rule.occurrenceCount ?? 6}
            onChange={(e) => updateRule("occurrenceCount", Math.max(1, Math.min(MAX_SERIES_OCCURRENCES, Number(e.target.value))))}
            inputProps={{ min: 1, max: MAX_SERIES_OCCURRENCES }}
            helperText={`Maximum ${MAX_SERIES_OCCURRENCES} appointments`}
          />

          {/* Summary */}
          {summary && (
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, color: "#2563eb", mt: 1 }}>
              {summary}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}
