"use client";

/**
 * Month Navigator — Milestone 17.1.
 *
 * Previous/next month controls with current month label.
 */

import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Props = {
  year: number;
  month: number; // 1–12
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
};

export default function MonthNavigator({
  year,
  month,
  onPrevious,
  onNext,
  canGoPrevious,
}: Props) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
      <IconButton
        onClick={onPrevious}
        disabled={!canGoPrevious}
        size="small"
        aria-label="Previous month"
      >
        <ChevronLeftIcon />
      </IconButton>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {MONTH_NAMES[month - 1]} {year}
      </Typography>
      <IconButton onClick={onNext} size="small" aria-label="Next month">
        <ChevronRightIcon />
      </IconButton>
    </Stack>
  );
}
