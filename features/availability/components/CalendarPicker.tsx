"use client";

/**
 * Calendar Picker — Milestone 17.1.
 *
 * Monthly calendar grid for date selection.
 * Highlights today, available dates, and selected date.
 * Disables past dates and fully booked days.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  year: number;
  month: number; // 1–12
  availableDays: Set<string>; // "YYYY-MM-DD"
  selectedDate: string | null;
  todayStr: string; // "YYYY-MM-DD"
  onSelectDate: (date: string) => void;
  loading?: boolean;
};

export default function CalendarPicker({
  year,
  month,
  availableDays,
  selectedDate,
  todayStr,
  onSelectDate,
  loading = false,
}: Props) {
  const firstOfMonth = new Date(year, month - 1, 1);
  // ISO weekday: Mon=0 in our grid
  const startDayOfWeek = (firstOfMonth.getDay() + 6) % 7; // Convert Sun=0 to Mon=0
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build grid cells
  const cells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null); // Empty cells before first day
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  return (
    <Box>
      {/* Day labels */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
          mb: 0.5,
        }}
      >
        {DAY_LABELS.map((label) => (
          <Typography
            key={label}
            variant="caption"
            sx={{ textAlign: "center", fontWeight: 600, color: "text.secondary" }}
          >
            {label}
          </Typography>
        ))}
      </Box>

      {/* Date grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
        }}
      >
        {cells.map((cell, idx) => {
          if (!cell) {
            return <Box key={`empty-${idx}`} />;
          }

          const { day, dateStr } = cell;
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isAvailable = availableDays.has(dateStr);
          const isDisabled = isPast || (!isAvailable && !loading);

          return (
            <IconButton
              key={dateStr}
              onClick={() => !isDisabled && onSelectDate(dateStr)}
              disabled={isDisabled}
              size="small"
              aria-label={`${dateStr}${isToday ? " (today)" : ""}${isAvailable ? " (available)" : ""}`}
              sx={{
                width: 36,
                height: 36,
                mx: "auto",
                fontSize: "0.8125rem",
                fontWeight: isSelected ? 700 : isToday ? 600 : 400,
                bgcolor: isSelected
                  ? "primary.main"
                  : isToday
                    ? "action.hover"
                    : "transparent",
                color: isSelected
                  ? "primary.contrastText"
                  : isDisabled
                    ? "text.disabled"
                    : "text.primary",
                border: isToday && !isSelected ? 1 : 0,
                borderColor: "primary.main",
                "&:hover": {
                  bgcolor: isSelected ? "primary.dark" : "action.hover",
                },
                // Availability dot
                position: "relative",
                "&::after": isAvailable && !isSelected
                  ? {
                      content: '""',
                      position: "absolute",
                      bottom: 2,
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                    }
                  : undefined,
              }}
            >
              {day}
            </IconButton>
          );
        })}
      </Box>
    </Box>
  );
}
