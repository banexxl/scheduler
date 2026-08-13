"use client";

/**
 * Analytics Period Selector — Milestone 15.9.1.
 *
 * URL-based period selection that preserves page path.
 */

import { usePathname } from "next/navigation";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";

type Props = {
  currentPeriod: string;
};

const PERIODS = [
  { value: "7days", label: "7d" },
  { value: "30days", label: "30d" },
  { value: "this_month", label: "Month" },
  { value: "this_quarter", label: "Quarter" },
  { value: "this_year", label: "Year" },
];

export default function AnalyticsPeriodSelector({ currentPeriod }: Props) {
  const pathname = usePathname();

  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap">
      {PERIODS.map((p) => (
        <Chip
          key={p.value}
          label={p.label}
          component="a"
          href={`${pathname}?period=${p.value}`}
          clickable
          variant={currentPeriod === p.value ? "filled" : "outlined"}
          color={currentPeriod === p.value ? "primary" : "default"}
          size="small"
        />
      ))}
    </Stack>
  );
}
