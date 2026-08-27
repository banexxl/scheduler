"use client";

/**
 * Location Card — Milestone 17.0.
 *
 * Selectable card for a business location.
 * Shows name, address, city. Highlights when selected.
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import PlaceIcon from "@mui/icons-material/Place";
import PhoneIcon from "@mui/icons-material/Phone";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { BookingLocation } from "../types";

type Props = {
  location: BookingLocation;
  selected: boolean;
  onSelect: (locationId: string) => void;
};

export default function LocationCard({ location, selected, onSelect }: Props) {
  const addressParts = [location.streetAddress, location.city].filter(Boolean).join(", ");

  return (
    <Paper
      variant="outlined"
      onClick={() => onSelect(location.id)}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(location.id);
        }
      }}
      sx={{
        p: 2,
        cursor: "pointer",
        borderColor: selected ? "primary.main" : "divider",
        borderWidth: selected ? 2 : 1,
        bgcolor: selected ? "primary.50" : "background.paper",
        transition: "border-color 0.15s, background-color 0.15s",
        "&:hover": {
          borderColor: selected ? "primary.main" : "primary.light",
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Stack sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {location.name}
          </Typography>

          {addressParts && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PlaceIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {addressParts}
              </Typography>
            </Stack>
          )}

          {location.phoneNumber && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PhoneIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {location.phoneNumber}
              </Typography>
            </Stack>
          )}
        </Stack>

        {selected && (
          <CheckCircleIcon color="primary" sx={{ fontSize: 22, flexShrink: 0 }} />
        )}
      </Stack>
    </Paper>
  );
}
