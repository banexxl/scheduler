"use client";

/**
 * Staff Card — Milestone 17.0.
 *
 * Selectable card for a staff member.
 * Shows avatar, name, title. Highlights when selected.
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import type { EligibleStaffMember } from "../types";

type Props = {
  staff: EligibleStaffMember | null; // null = "Any Available"
  selected: boolean;
  onSelect: (staffId: string | null) => void;
};

export default function StaffCard({ staff, selected, onSelect }: Props) {
  const isAny = staff === null;
  const displayName = isAny ? "Any Available" : staff.displayName;
  const subtitle = isAny ? "Let us pick the best available staff" : staff.jobTitle;

  return (
    <Paper
      variant="outlined"
      onClick={() => onSelect(isAny ? null : staff.id)}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(isAny ? null : staff.id);
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
        {isAny ? (
          <Avatar sx={{ width: 48, height: 48, bgcolor: "action.hover" }}>
            <ShuffleIcon color="action" />
          </Avatar>
        ) : staff.avatarUrl ? (
          <Avatar src={staff.avatarUrl} alt={displayName} sx={{ width: 48, height: 48 }} />
        ) : (
          <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main", fontSize: "1.125rem" }}>
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
        )}

        <Stack sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {displayName}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Stack>

        {selected && (
          <CheckCircleIcon color="primary" sx={{ fontSize: 22, flexShrink: 0 }} />
        )}
      </Stack>
    </Paper>
  );
}
