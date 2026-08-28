"use client";

/**
 * Time Slot Grid — Milestone 17.1.
 *
 * Displays available time slots grouped by morning/afternoon/evening.
 * Highlights the selected slot.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import type { SimplifiedSlot } from "@/features/booking/actions/availability-actions";

type Props = {
  slots: SimplifiedSlot[];
  selectedStartsAt: string | null;
  onSelect: (slot: SimplifiedSlot) => void;
};

function getTimeGroup(localTime: string): "morning" | "afternoon" | "evening" {
  const hour = parseInt(localTime.split(":")[0]!, 10);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const GROUP_LABELS = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const GROUP_ORDER: Array<"morning" | "afternoon" | "evening"> = ["morning", "afternoon", "evening"];

export default function TimeSlotGrid({ slots, selectedStartsAt, onSelect }: Props) {
  // Group by time of day
  const grouped = new Map<string, SimplifiedSlot[]>();
  for (const slot of slots) {
    const group = getTimeGroup(slot.localStartTime);
    const list = grouped.get(group) ?? [];
    list.push(slot);
    grouped.set(group, list);
  }

  return (
    <Box>
      {GROUP_ORDER.map((group) => {
        const groupSlots = grouped.get(group);
        if (!groupSlots || groupSlots.length === 0) return null;

        return (
          <Box key={group} sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", fontWeight: 600 }}>
              {GROUP_LABELS[group]}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {groupSlots.map((slot) => {
                const isSelected = slot.startsAt === selectedStartsAt;
                return (
                  <Chip
                    key={slot.startsAt}
                    label={slot.localStartTime}
                    onClick={() => onSelect(slot)}
                    variant={isSelected ? "filled" : "outlined"}
                    color={isSelected ? "primary" : "default"}
                    sx={{
                      fontWeight: isSelected ? 700 : 400,
                      cursor: "pointer",
                      minWidth: 72,
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}
