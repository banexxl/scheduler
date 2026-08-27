"use client";

/**
 * Service Card — Milestone 17.0.
 *
 * Selectable card for a single service.
 * Shows name, duration, price. Highlights when selected.
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { SelectedService } from "../types";

type Props = {
  service: SelectedService;
  selected: boolean;
  onToggle: (service: SelectedService) => void;
};

export default function ServiceCard({ service, selected, onToggle }: Props) {
  return (
    <Paper
      variant="outlined"
      onClick={() => onToggle(service)}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(service);
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
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Stack spacing={0.25} sx={{ flexGrow: 1, mr: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {service.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {service.durationMinutes} min
          {parseFloat(service.price) > 0 && (
            <> &middot; {service.currency} {service.price}</>
          )}
        </Typography>
      </Stack>

      {selected && (
        <CheckCircleIcon color="primary" sx={{ fontSize: 22, flexShrink: 0 }} />
      )}
    </Paper>
  );
}
