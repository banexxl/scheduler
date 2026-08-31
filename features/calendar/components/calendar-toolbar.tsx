"use client";

/**
 * Calendar toolbar — Milestone 6.10.
 * View switcher, date navigation, location/resource filters.
 * Uses callbacks instead of URL navigation for instant client-side state updates.
 */

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import type { CalendarView } from "../types/calendar";
import { addTenantLocalDays } from "@/lib/scheduling/calendar-utils";

type EntityOption = { id: string; name: string };

type Props = {
  view: CalendarView;
  date: string;
  today: string;
  locationId: string | null;
  resourceId: string | null;
  locations: EntityOption[];
  resources: EntityOption[];
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: string) => void;
  onLocationChange: (locationId: string | null) => void;
  onResourceChange: (resourceId: string | null) => void;
  isFetching?: boolean;
};

export default function CalendarToolbar({
  view,
  date,
  today,
  locationId,
  resourceId,
  locations,
  resources,
  onViewChange,
  onDateChange,
  onLocationChange,
  onResourceChange,
  isFetching,
}: Props) {
  const prevDate = addTenantLocalDays(date, view === "week" ? -7 : -1);
  const nextDate = addTenantLocalDays(date, view === "week" ? 7 : 1);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", justifyContent: "space-between" }}>
      {/* Left: Navigation */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Button variant="outlined" size="small" onClick={() => onDateChange(today)}>
          Today
        </Button>
        <IconButton size="small" onClick={() => onDateChange(prevDate)} aria-label="Previous">
          ◀
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 120, textAlign: "center" }}>
          {date}
        </Typography>
        <IconButton size="small" onClick={() => onDateChange(nextDate)} aria-label="Next">
          ▶
        </IconButton>
        {isFetching && <CircularProgress size={18} sx={{ ml: 0.5 }} />}
      </Box>

      {/* Center: View toggle */}
      <ButtonGroup size="small" variant="outlined">
        <Button
          onClick={() => onViewChange("day")}
          variant={view === "day" ? "contained" : "outlined"}
        >
          Day
        </Button>
        <Button
          onClick={() => onViewChange("week")}
          variant={view === "week" ? "contained" : "outlined"}
        >
          Week
        </Button>
      </ButtonGroup>

      {/* Right: Filters */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          select
          size="small"
          value={locationId ?? ""}
          onChange={(e) => onLocationChange(e.target.value || null)}
          sx={{ minWidth: 140 }}
          label="Location"
        >
          <MenuItem value="">All locations</MenuItem>
          {locations.map((l) => (
            <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          value={resourceId ?? ""}
          onChange={(e) => onResourceChange(e.target.value || null)}
          sx={{ minWidth: 140 }}
          label="Resource"
        >
          <MenuItem value="">All resources</MenuItem>
          {resources.map((r) => (
            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
          ))}
        </TextField>
      </Box>
    </Box>
  );
}
