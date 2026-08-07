"use client";

/**
 * Appointment Quick Actions — Milestones 6.9, 8.3.
 *
 * Shows contextual operational actions based on current appointment status.
 * Used in the today view, calendar drawer, and wherever inline status
 * transitions are needed without leaving the current context.
 *
 * Actions shown per status:
 * - pending: Confirm
 * - confirmed: Check in, Start service, Complete, No-show, Cancel, Reschedule
 * - checked_in: Start service, Complete, No-show, Cancel
 * - in_progress: Complete, Cancel
 * - terminal (completed/cancelled/no_show): read-only, no actions
 *
 * Reuses existing:
 * - updateAppointmentStatusAction (status transitions)
 * - cancelAppointmentAction (cancellation with reason)
 * - STATUS_TRANSITIONS (valid transition rules)
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { useRouter } from "next/navigation";
import { updateAppointmentStatusAction } from "../actions/update-status-action";
import { cancelAppointmentAction } from "../actions/cancel-appointment-action";
import {
     STATUS_TRANSITIONS,
     isTerminalStatus,
} from "../types/appointment";
import type { AppointmentStatus } from "../types/appointment";

type Props = {
     tenantSlug: string;
     appointmentId: string;
     currentStatus: AppointmentStatus;
     /** Show reschedule link (requires navigation capability) */
     showReschedule?: boolean;
     /** Compact mode hides labels and uses smaller buttons */
     compact?: boolean;
};

type QuickAction = {
     label: string;
     status: AppointmentStatus;
     color?: "primary" | "warning" | "error" | "success" | "inherit";
     variant?: "outlined" | "contained" | "text";
};

/** Primary forward-progress actions per status */
const PRIMARY_ACTIONS: Record<AppointmentStatus, QuickAction[]> = {
     pending: [{ label: "Confirm", status: "confirmed" }],
     confirmed: [
          { label: "Check in", status: "checked_in" },
          { label: "Start service", status: "in_progress" },
     ],
     checked_in: [
          { label: "Start service", status: "in_progress" },
          { label: "Complete", status: "completed", color: "success" },
     ],
     in_progress: [
          { label: "Complete", status: "completed", color: "success" },
     ],
     completed: [],
     cancelled: [],
     no_show: [],
};

/** Secondary actions (complete from confirmed, no-show, cancel) */
function getSecondaryActions(currentStatus: AppointmentStatus): QuickAction[] {
     const transitions = STATUS_TRANSITIONS[currentStatus];
     const secondary: QuickAction[] = [];

     // Complete (if allowed and not already in primary)
     if (transitions.includes("completed") && currentStatus === "confirmed") {
          secondary.push({ label: "Complete", status: "completed", color: "success" });
     }

     // No-show
     if (transitions.includes("no_show")) {
          secondary.push({ label: "No-show", status: "no_show", color: "warning" });
     }

     return secondary;
}

export default function AppointmentQuickActions({
     tenantSlug,
     appointmentId,
     currentStatus,
     showReschedule = true,
     compact = false,
}: Props) {
     const router = useRouter();
     const [isPending, startTransition] = useTransition();
     const [error, setError] = useState("");
     const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
     const [cancelReason, setCancelReason] = useState("");

     if (isTerminalStatus(currentStatus)) return null;

     const primaryActions = PRIMARY_ACTIONS[currentStatus];
     const secondaryActions = getSecondaryActions(currentStatus);
     const canCancel = STATUS_TRANSITIONS[currentStatus].includes("cancelled");

     async function handleStatusAction(targetStatus: AppointmentStatus) {
          setError("");
          const result = await updateAppointmentStatusAction(tenantSlug, appointmentId, {
               status: targetStatus,
          });
          if (result.success) {
               startTransition(() => router.refresh());
          } else {
               setError(result.error);
          }
     }

     async function handleCancel() {
          setError("");
          const result = await cancelAppointmentAction(tenantSlug, appointmentId, {
               reason: cancelReason.trim() || null,
          });
          if (result.success) {
               setCancelDialogOpen(false);
               setCancelReason("");
               startTransition(() => router.refresh());
          } else {
               setError(result.error);
          }
     }

     const buttonSize = compact ? "small" : "small";

     return (
          <Box>
               {error && (
                    <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError("")}>
                         {error}
                    </Alert>
               )}

               <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {/* Primary forward-progress actions */}
                    {primaryActions.map((action) => (
                         <Button
                              key={action.status}
                              size={buttonSize}
                              variant="outlined"
                              color={action.color ?? "primary"}
                              onClick={() => handleStatusAction(action.status)}
                              disabled={isPending}
                         >
                              {action.label}
                         </Button>
                    ))}

                    {/* Secondary actions */}
                    {secondaryActions.map((action) => (
                         <Button
                              key={action.status}
                              size={buttonSize}
                              variant="outlined"
                              color={action.color ?? "inherit"}
                              onClick={() => handleStatusAction(action.status)}
                              disabled={isPending}
                         >
                              {action.label}
                         </Button>
                    ))}

                    {/* Cancel */}
                    {canCancel && (
                         <Button
                              size={buttonSize}
                              variant="outlined"
                              color="error"
                              onClick={() => setCancelDialogOpen(true)}
                              disabled={isPending}
                         >
                              Cancel
                         </Button>
                    )}

                    {/* Reschedule link */}
                    {showReschedule && !isTerminalStatus(currentStatus) && (
                         <Button
                              component="a"
                              href={`/${tenantSlug}/appointments/${appointmentId}/edit`}
                              size={buttonSize}
                              variant="text"
                              color="inherit"
                              disabled={isPending}
                         >
                              Reschedule
                         </Button>
                    )}
               </Stack>

               {/* Cancel confirmation dialog */}
               <Dialog
                    open={cancelDialogOpen}
                    onClose={() => setCancelDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
               >
                    <DialogTitle>Cancel Appointment</DialogTitle>
                    <DialogContent>
                         <Typography variant="body2" sx={{ mb: 2 }}>
                              Are you sure you want to cancel this appointment? This cannot be undone.
                         </Typography>
                         <TextField
                              label="Cancellation reason (optional)"
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              fullWidth
                              multiline
                              rows={2}
                              slotProps={{ htmlInput: { maxLength: 1000 } }}
                         />
                    </DialogContent>
                    <DialogActions>
                         <Button onClick={() => setCancelDialogOpen(false)}>Keep</Button>
                         <Button
                              onClick={handleCancel}
                              color="error"
                              variant="contained"
                              disabled={isPending}
                         >
                              Confirm Cancel
                         </Button>
                    </DialogActions>
               </Dialog>
          </Box>
     );
}
