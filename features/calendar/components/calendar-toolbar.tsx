"use client";

/**
 * Calendar toolbar — Milestone 6.10.
 * View switcher, date navigation, location/resource/status filters.
 * Implementation in Task #4.
 */

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import type { CalendarFilters } from "../types/calendar";
import { addTenantLocalDays } from "@/lib/scheduling/calendar-utils";

type EntityOption = { id: string; name: string };

type Props = {
  tenantSlug: string;
  filters: CalendarFilters;
  today: string;
  locations: EntityOption[];
  resources: EntityOption[];
};

export default function CalendarToolbar({
  tenantSlug,
  filters,
  today,
  locations,
  resources,
}: Props) {
  const router = useRouter();

  function buildUrl(overrides: Partial<CalendarFilters>): string {
    const merged = { ...filters, ...overrides };
    const params = new URLSearchParams();
    params.set("view", merged.view);
    params.set("date", merged.date);
    if (merged.locationId) params.set("location", merged.locationId);
    if (merged.resourceId) params.set("resource", merged.resourceId);
    if (merged.status) params.set("status", merged.status);
    return `/${tenantSlug}/calendar?${params.toString()}`;
  }

  function navigate(overrides: Partial<CalendarFilters>) {
    router.push(buildUrl(overrides));
  }

  const prevDate = addTenantLocalDays(filters.date, filters.view === "week" ? -7 : -1);
  const nextDate = addTenantLocalDays(filters.date, filters.view === "week" ? 7 : 1);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", justifyContent: "space-between" }}>
      {/* Left: Navigation */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Button variant="outlined" size="small" onClick={() => navigate({ date: today })}>
          Today
        </Button>
        <IconButton size="small" onClick={() => navigate({ date: prevDate })} aria-label="Previous">
          ◀
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 120, textAlign: "center" }}>
          {filters.date}
        </Typography>
        <IconButton size="small" onClick={() => navigate({ date: nextDate })} aria-label="Next">
          ▶
        </IconButton>
      </Box>

      {/* Center: View toggle */}
      <ButtonGroup size="small" variant="outlined">
        <Button
          onClick={() => navigate({ view: "day" })}
          variant={filters.view === "day" ? "contained" : "outlined"}
        >
          Day
        </Button>
        <Button
          onClick={() => navigate({ view: "week" })}
          variant={filters.view === "week" ? "contained" : "outlined"}
        >
          Week
        </Button>
      </ButtonGroup>

      {/* Right: Filters */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          select
          size="small"
          value={filters.locationId ?? ""}
          onChange={(e) => navigate({ locationId: e.target.value || null, resourceId: null })}
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
          value={filters.resourceId ?? ""}
          onChange={(e) => navigate({ resourceId: e.target.value || null })}
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
