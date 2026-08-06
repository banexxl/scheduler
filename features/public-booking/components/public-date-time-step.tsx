"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
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

export default function PublicDateTimeStep({
  tenantSlug,
  serviceId,
  locationId,
  resourceId,
  timeZone,
  onSelect,
  onBack,
}: Props) {
  const [date, setDate] = useState("");
  const [options, setOptions] = useState<PublicAvailabilityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAvailability() {
    if (!date) return;
    setLoading(true);
    setError("");
    setOptions([]);

    const result = await getPublicAvailabilityAction(tenantSlug, {
      serviceId,
      locationId,
      resourceId: resourceId ?? undefined,
      localDate: date,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOptions(result.data.options);
    if (result.data.options.length === 0) {
      setError("No available times were found for this date.");
    }
  }

  function handleSelect(option: PublicAvailabilityOption) {
    // Pick first resource option (or let user choose if multiple)
    const resId = option.resourceOptions[0]?.resourceId;
    if (resId) onSelect(option, resId);
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Choose a date and time</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Times shown in {timeZone}
      </Typography>

      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end", mb: 2 }}>
        <TextField
          type="date"
          label="Date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setOptions([]); setError(""); }}
          InputLabelProps={{ shrink: true }}
          fullWidth
          size="small"
        />
        <Button onClick={loadAvailability} disabled={!date || loading} variant="outlined" sx={{ whiteSpace: "nowrap" }}>
          {loading ? <CircularProgress size={18} /> : "Find times"}
        </Button>
      </Box>

      {error && <Alert severity="info" sx={{ mb: 2 }}>{error}</Alert>}

      {options.length > 0 && (
        <Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {options.map((option) => (
              <Chip
                key={option.startsAt}
                label={`${option.localStartTime}–${option.localEndTime}`}
                onClick={() => handleSelect(option)}
                clickable
                variant="outlined"
                color="primary"
              />
            ))}
          </Box>
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            Times are not reserved until your booking is confirmed.
          </Alert>
        </Box>
      )}

      <Button onClick={onBack} variant="text">Back</Button>
    </Box>
  );
}
