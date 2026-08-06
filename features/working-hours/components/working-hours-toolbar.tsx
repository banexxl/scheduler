"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

type WorkingHoursToolbarProps = {
  onApplyMondayToAll: () => void;
  onApplyWeekdays: () => void;
  onApplyWeekends: () => void;
  disabled: boolean;
};

/**
 * Convenience actions for bulk-applying working hours.
 * These are client-side only — nothing saved until the user presses Save.
 */
export default function WorkingHoursToolbar({
  onApplyMondayToAll,
  onApplyWeekdays,
  onApplyWeekends,
  disabled,
}: WorkingHoursToolbarProps) {
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
      <Button
        size="small"
        variant="outlined"
        onClick={onApplyMondayToAll}
        disabled={disabled}
      >
        Apply Monday to All
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={onApplyWeekdays}
        disabled={disabled}
      >
        Apply to Weekdays
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={onApplyWeekends}
        disabled={disabled}
      >
        Apply to Weekends
      </Button>
    </Box>
  );
}
