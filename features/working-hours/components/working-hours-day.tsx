"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import { DAY_NAMES } from "../types/working-hours";

type WorkingHoursDayProps = {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  onClosedChange: (closed: boolean) => void;
  onOpensAtChange: (value: string) => void;
  onClosesAtChange: (value: string) => void;
  disabled: boolean;
  error?: string;
};

/**
 * A single day card for the working hours form.
 * Shows day name, open/closed toggle, and time inputs.
 */
export default function WorkingHoursDay({
  dayOfWeek,
  isClosed,
  opensAt,
  closesAt,
  onClosedChange,
  onOpensAtChange,
  onClosesAtChange,
  disabled,
  error,
}: WorkingHoursDayProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        opacity: isClosed ? 0.7 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, minWidth: 100 }}>
          {DAY_NAMES[dayOfWeek] ?? `Day ${dayOfWeek}`}
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={!isClosed}
              onChange={(e) => onClosedChange(!e.target.checked)}
              disabled={disabled}
              size="small"
            />
          }
          label={<Typography variant="body2">{isClosed ? "Closed" : "Open"}</Typography>}
          sx={{ mr: 0 }}
        />
      </Box>

      {!isClosed && (
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            type="time"
            label="Opens"
            value={opensAt ?? ""}
            onChange={(e) => onOpensAtChange(e.target.value)}
            disabled={disabled}
            size="small"
            slotProps={{
              htmlInput: { step: 900 }, // 15 min
            }}
            sx={{ width: 140 }}
          />
          <Typography variant="body2" color="text.secondary">to</Typography>
          <TextField
            type="time"
            label="Closes"
            value={closesAt ?? ""}
            onChange={(e) => onClosesAtChange(e.target.value)}
            disabled={disabled}
            size="small"
            slotProps={{
              htmlInput: { step: 900 },
            }}
            sx={{ width: 140 }}
          />
        </Box>
      )}

      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
          {error}
        </Typography>
      )}
    </Paper>
  );
}
