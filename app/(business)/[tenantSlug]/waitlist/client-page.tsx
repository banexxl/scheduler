"use client";

/**
 * Waitlist Client Page — Milestone 8.8.
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import type { WaitlistEntryListItem } from "@/features/waitlist/types/waitlist";

type Props = {
  tenantSlug: string;
  entries: WaitlistEntryListItem[];
  canManage: boolean;
};

const STATUS_COLORS: Record<string, "default" | "primary" | "success" | "warning" | "error"> = {
  active: "primary",
  matched: "warning",
  booked: "success",
  expired: "default",
  cancelled: "error",
};

export default function WaitlistClientPage({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No waitlist entries yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {entries.map((entry) => (
        <Paper key={entry.id} variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {entry.customerName}
                {entry.customerEmail && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {entry.customerEmail}
                  </Typography>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {entry.serviceName} • {entry.locationName}
                {entry.resourceName && ` • ${entry.resourceName}`}
                {entry.allowAnyResource && !entry.resourceName && " • Any resource"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {entry.preferredDateFrom} – {entry.preferredDateTo}
                {entry.preferredTimeFrom && entry.preferredTimeTo && ` (${entry.preferredTimeFrom}–${entry.preferredTimeTo})`}
              </Typography>
            </Box>
            <Stack alignItems="flex-end" spacing={0.5}>
              <Chip
                label={entry.status}
                size="small"
                color={STATUS_COLORS[entry.status] ?? "default"}
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                {new Date(entry.createdAt).toLocaleDateString()}
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
