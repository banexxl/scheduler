"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import { getAvailabilityPreview } from "../actions/get-availability-preview";
import type { AvailabilityResult, ResourceAvailabilityResult } from "../types/availability";

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  tenantSlug: string;
  serviceId: string;
  locations: { id: string; name: string }[];
  resources: { id: string; name: string }[];
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AvailabilityPreviewClient({
  tenantSlug,
  serviceId,
  locations,
  resources,
}: Props) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [resourceId, setResourceId] = useState("");
  const [localDate, setLocalDate] = useState(getTodayString());
  const [slotInterval, setSlotInterval] = useState(15);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCalculate() {
    setError(null);
    startTransition(async () => {
      const response = await getAvailabilityPreview(tenantSlug, {
        serviceId,
        locationId,
        resourceId: resourceId || null,
        localDate,
        slotIntervalMinutes: slotInterval,
      });

      if (response.success) {
        setResult(response.data);
      } else {
        setResult(null);
        setError(response.error);
      }
    });
  }

  return (
    <Box>
      {/* Filters */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
          <TextField
            select
            label="Location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            sx={{ minWidth: 200 }}
            size="small"
          >
            {locations.map((loc) => (
              <MenuItem key={loc.id} value={loc.id}>
                {loc.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Resource (optional)"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            sx={{ minWidth: 200 }}
            size="small"
          >
            <MenuItem value="">All eligible resources</MenuItem>
            {resources.map((res) => (
              <MenuItem key={res.id} value={res.id}>
                {res.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type="date"
            label="Date"
            value={localDate}
            onChange={(e) => setLocalDate(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            type="number"
            label="Preview interval override (min)"
            value={slotInterval}
            onChange={(e) => setSlotInterval(Number(e.target.value))}
            size="small"
            slotProps={{ input: { inputProps: { min: 5, max: 120 } } }}
            sx={{ width: 200 }}
          />

          <Button
            variant="contained"
            onClick={handleCalculate}
            disabled={isPending || !locationId || !localDate}
          >
            {isPending ? <CircularProgress size={20} /> : "Calculate"}
          </Button>
        </Box>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {result && (
        <Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Timezone: {result.timeZone}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total slots: {result.totalSlots}
            </Typography>
            {result.reasonCode && (
              <Chip label={result.reasonCode} size="small" color="warning" />
            )}
          </Box>

          {result.resources.length === 0 && result.reasonCode && (
            <Alert severity="warning">
              No availability: {formatReasonCode(result.reasonCode)}
            </Alert>
          )}

          {result.bookingRules && (
            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
              <Chip
                label={`Interval: ${result.bookingRules.effectiveSlotInterval}min (${result.bookingRules.slotIntervalSource})`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Min notice: ${result.bookingRules.minimumNoticeMinutes}min`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Max advance: ${result.bookingRules.maximumAdvanceDays}d`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Same-day: ${result.bookingRules.allowSameDayBooking ? "yes" : "no"}`}
                size="small"
                variant="outlined"
              />
              {(result.bookingRules.removedByRules.minimumNotice > 0 ||
                result.bookingRules.removedByRules.sameDayDisabled > 0 ||
                result.bookingRules.removedByRules.maximumAdvance > 0) && (
                  <Chip
                    label={`Removed by rules: ${result.bookingRules.removedByRules.minimumNotice + result.bookingRules.removedByRules.sameDayDisabled + result.bookingRules.removedByRules.maximumAdvance}`}
                    size="small"
                    color="info"
                  />
                )}
            </Box>
          )}

          {result.resources.map((resourceResult) => (
            <ResourceResultCard key={resourceResult.resourceId} result={resourceResult} />
          ))}
        </Box>
      )}
    </Box>
  );
}

// ─── Resource Result Card ────────────────────────────────────────────────────

function ResourceResultCard({ result }: { result: ResourceAvailabilityResult }) {
  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {result.resourceName}
        </Typography>
        <Chip
          label={`${result.slots.length} slots`}
          size="small"
          color={result.slots.length > 0 ? "success" : "default"}
        />
        {result.reasonCode && (
          <Chip label={result.reasonCode} size="small" color="warning" variant="outlined" />
        )}
      </Box>

      {result.slots.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
          {result.slots.map((slot, idx) => (
            <SlotChip key={idx} slot={slot} />
          ))}
        </Box>
      )}

      {result.slots.length > 0 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary">
              Duration: {result.slots[0]!.durationMinutes}min
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Buffer before: {result.slots[0]!.bufferBeforeMinutes}min
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Buffer after: {result.slots[0]!.bufferAfterMinutes}min
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Price: {result.slots[0]!.price} {result.slots[0]!.currency}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Source: {result.slots[0]!.source.serviceValues}
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );
}

// ─── Slot Chip ───────────────────────────────────────────────────────────────

function SlotChip({ slot }: { slot: { localStartTime: string; localEndTime: string; occupiedWindowStartsAt: string; occupiedWindowEndsAt: string } }) {
  const occupiedStart = new Date(slot.occupiedWindowStartsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const occupiedEnd = new Date(slot.occupiedWindowEndsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <Chip
      label={`${slot.localStartTime}–${slot.localEndTime}`}
      size="small"
      variant="outlined"
      title={`Occupied: ${occupiedStart}–${occupiedEnd}`}
    />
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatReasonCode(code: string): string {
  return code.replace(/_/g, " ").toLowerCase();
}
