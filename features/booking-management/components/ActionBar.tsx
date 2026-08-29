"use client";

/**
 * Booking Action Bar — Milestone 18.1.
 *
 * Shows reschedule and cancel buttons based on policy permissions.
 * Displays friendly notices when actions are disabled.
 */

import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import CancelIcon from "@mui/icons-material/Cancel";
import PolicyNotice from "./PolicyNotice";
import type { ModificationPermissions } from "../types";

type Props = {
  permissions: ModificationPermissions;
  onReschedule: () => void;
  onCancel: () => void;
};

export default function ActionBar({ permissions, onReschedule, onCancel }: Props) {
  const noActions = !permissions.canCancel && !permissions.canReschedule;

  // If both are disabled with the same reason (terminal status), show one notice
  if (noActions && permissions.cancelReason === permissions.rescheduleReason && permissions.cancelReason) {
    return <PolicyNotice reason={permissions.cancelReason} />;
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
        {permissions.canReschedule && (
          <Button
            variant="outlined"
            startIcon={<EditCalendarIcon />}
            onClick={onReschedule}
            sx={{ textTransform: "none" }}
          >
            Reschedule
          </Button>
        )}
        {permissions.canCancel && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={onCancel}
            sx={{ textTransform: "none" }}
          >
            Cancel Booking
          </Button>
        )}
      </Stack>

      {/* Show individual policy notices for disabled actions */}
      {!permissions.canReschedule && permissions.rescheduleReason && permissions.canCancel && (
        <PolicyNotice reason={permissions.rescheduleReason} />
      )}
      {!permissions.canCancel && permissions.cancelReason && permissions.canReschedule && (
        <PolicyNotice reason={permissions.cancelReason} />
      )}
    </Stack>
  );
}
