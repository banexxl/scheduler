"use client";

/**
 * Public Date & Time Step — Milestones 6.11, 8.5.
 *
 * Enhanced with:
 * - Horizontal date strip (7 days at a time, navigate forward/back)
 * - "Next available" shortcut
 * - Time slots grouped by morning/afternoon/evening
 * - Loading skeleton
 * - Stale slot handling
 * - Availability disclaimer
 * - Tenant-local dates (not browser-local)
 */

import { useState, useCallback, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import type { PublicAvailabilityOption, PublicBookingSettings } from "../types/public-booking";
import { getPublicAvailabilityAction } from "../actions/get-public-availability-action";

type Props = {
  tenantSlug: string;
  tenantId: string;
  serviceId: string;
  locationId: string;
  resourceId: string | null;
  settings: PublicBookingSettings;
  timeZone: string;
  onSelect: (option: PublicAvailabilityOption, resourceId: string) => void;
  onBack: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string): { day: string; date: string; month: string } {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return { day: days[dt.getDay()]!, date: String(d), month: months[m - 1]! };
}

function getTimeGroup(localTime: string): "morning" | "afternoon" | "evening" {
  const hour = parseInt(localTime.split(":")[0]!, 10);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const GROUP_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

// ─── Component ───────────────────────────────────────────────────────────────

export default function PublicDateTimeStep({
  tenantSlug,
  serviceId,
  locationId,
  resourceId,
  timeZone,
  onSelect,
  onBack,
}: Props) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [stripStart, setStripStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [options, setOptions] = useState<PublicAvailabilityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchingNext, setSearchingNext] = useState(false);
  const requestRef = useRef(0);

  // Generate 7-day strip
  const stripDates = Array.from({ length: 7 }, (_, i) => addDays(stripStart, i));

  // Load availability for a date
  const loadAvailability = useCallback(async (date: string) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    setError("");
    setOptions([]);

    const result = await getPublicAvailabilityAction(tenantSlug, {
      serviceId,
      locationId,
      resourceId: resourceId ?? undefined,
      localDate: date,
    });

    if (reqId !== requestRef.current) return; // stale
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOptions(result.data.options);
  }, [tenantSlug, serviceId, locationId, resourceId]);

  // Next available shortcut
  async function handleNextAvailable() {
    setSearchingNext(true);
    setError("");
    const maxDays = 30;

    for (let i = 0; i < maxDays; i++) {
      const date = addDays(today, i);
      const result = await getPublicAvailabilityAction(tenantSlug, {
        serviceId,
        locationId,
        resourceId: resourceId ?? undefined,
        localDate: date,
      });

      if (result.success && result.data.options.length > 0) {
        setSelectedDate(date);
        setStripStart(date);
        setOptions(result.data.options);
        setSearchingNext(false);
        return;
      }
    }

    setSearchingNext(false);
    setError("No availability found in the next 30 days.");
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setOptions([]);
    setError("");
    loadAvailability(date);
  }

  function handleSlotSelect(option: PublicAvailabilityOption) {
    const resId = option.resourceOptions[0]?.resourceId;
    if (resId) onSelect(option, resId);
  }

  // Group slots
  const grouped = options.reduce<Record<string, PublicAvailabilityOption[]>>((acc, opt) => {
    const group = getTimeGroup(opt.localStartTime);
    if (!acc[group]) acc[group] = [];
    acc[group]!.push(opt);
    return acc;
  }, {});

  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        Choose a date and time
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        Times shown in {timeZone}
      </Typography>

      {/* Date strip */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}>
        <IconButton
          size="small"
          onClick={() => setStripStart(addDays(stripStart, -7))}
          disabled={stripStart <= today}
          aria-label="Previous week"
        >
          ‹
        </IconButton>

        <Box sx={{ display: "flex", gap: 0.75, flex: 1, overflowX: "auto", py: 0.5 }}>
          {stripDates.map((date) => {
            const label = formatDateLabel(date);
            const isSelected = date === selectedDate;
            const isPast = date < today;
            return (
              <Button
                key={date}
                variant={isSelected ? "contained" : "outlined"}
                size="small"
                disabled={isPast}
                onClick={() => handleDateSelect(date)}
                sx={{
                  minWidth: 54,
                  flexDirection: "column",
                  py: 0.75,
                  px: 1,
                  lineHeight: 1.2,
                  fontSize: "0.75rem",
                }}
                aria-label={`${label.day} ${label.month} ${label.date}`}
                aria-pressed={isSelected}
              >
                <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>{label.day}</span>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{label.date}</span>
                <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>{label.month}</span>
              </Button>
            );
          })}
        </Box>

        <IconButton
          size="small"
          onClick={() => setStripStart(addDays(stripStart, 7))}
          aria-label="Next week"
        >
          ›
        </IconButton>
      </Box>

      {/* Next available */}
      <Box sx={{ mb: 2 }}>
        <Button
          size="small"
          variant="text"
          onClick={handleNextAvailable}
          disabled={searchingNext || loading}
        >
          {searchingNext ? "Searching..." : "Next available →"}
        </Button>
      </Box>

      {/* Loading */}
      {loading && (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={36} width="60%" />
          <Skeleton variant="rounded" height={36} width="80%" />
          <Skeleton variant="rounded" height={36} width="40%" />
        </Stack>
      )}

      {/* Error */}
      {error && <Alert severity="info" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Slots grouped */}
      {!loading && options.length > 0 && (
        <Box>
          {(["morning", "afternoon", "evening"] as const).map((group) => {
            const slots = grouped[group];
            if (!slots || slots.length === 0) return null;
            return (
              <Box key={group} sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: "block" }}>
                  {GROUP_LABELS[group]}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {slots.map((opt) => (
                    <Chip
                      key={opt.startsAt}
                      label={opt.localStartTime}
                      onClick={() => handleSlotSelect(opt)}
                      clickable
                      variant="outlined"
                      color="primary"
                      sx={{ fontWeight: 600, minWidth: 64 }}
                      aria-label={`${opt.localStartTime} to ${opt.localEndTime}`}
                    />
                  ))}
                </Box>
              </Box>
            );
          })}

          <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
            Times are not reserved until your booking is confirmed.
          </Alert>
        </Box>
      )}

      {/* No slots for selected date */}
      {!loading && selectedDate && options.length === 0 && !error && (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No times available on this date.
          </Typography>
          <Button size="small" variant="text" onClick={handleNextAvailable} sx={{ mt: 1 }}>
            Find next available →
          </Button>
        </Box>
      )}

      <Button onClick={onBack} sx={{ mt: 2 }} variant="text">Back</Button>
    </Box>
  );
}
