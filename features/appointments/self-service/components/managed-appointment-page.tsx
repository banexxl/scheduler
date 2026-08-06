"use client";

import { useMemo, useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ManagedAppointmentSummary from "./managed-appointment-summary";
import ManagedAppointmentActions from "./managed-appointment-actions";
import ManagedAppointmentCancelDialog from "./managed-appointment-cancel-dialog";
import ManagedAppointmentRescheduleFlow from "./managed-appointment-reschedule-flow";
import {
     cancelAppointmentByTokenAction,
     getRescheduleAvailabilityByTokenAction,
     rescheduleAppointmentByTokenAction,
} from "../actions/manage-appointment-actions";
import type { PublicManagedAppointment } from "../types";

type ResourceAvailability = {
     resourceId: string;
     resourceName: string;
     slots: Array<{
          localStartTime: string;
          localEndTime: string;
          price: string;
          currency: string;
          durationMinutes: number;
     }>;
};

export default function ManagedAppointmentPage({
     token,
     initialAppointment,
}: {
     token: string;
     initialAppointment: PublicManagedAppointment;
}) {
     const [appointment, setAppointment] = useState(initialAppointment);
     const [cancelOpen, setCancelOpen] = useState(false);
     const [showReschedule, setShowReschedule] = useState(false);
     const [resources, setResources] = useState<ResourceAvailability[]>([]);
     const [error, setError] = useState<string | null>(null);
     const [success, setSuccess] = useState<string | null>(null);
     const [isPending, startTransition] = useTransition();

     const isTerminal = useMemo(
          () => ["cancelled", "completed", "no_show", "checked_in", "in_progress"].includes(appointment.status),
          [appointment.status]
     );

     const runCancel = async (reason: string | null) => {
          setError(null);
          setSuccess(null);

          startTransition(async () => {
               const result = await cancelAppointmentByTokenAction(token, {
                    reason,
                    idempotencyKey: crypto.randomUUID(),
               });

               if (!result.success) {
                    setError(result.error);
                    return;
               }

               setAppointment(result.data.appointment as PublicManagedAppointment);
               setCancelOpen(false);
               setSuccess("Appointment cancelled successfully.");
          });
     };

     const loadAvailability = async (localDate: string, resourceId: string | null) => {
          setError(null);

          startTransition(async () => {
               const result = await getRescheduleAvailabilityByTokenAction(token, {
                    localDate,
                    resourceId,
               });

               if (!result.success) {
                    setError(result.error);
                    return;
               }

               setResources(result.data.resources as ResourceAvailability[]);
          });
     };

     const runReschedule = async (input: {
          localDate: string;
          localStartTime: string;
          resourceId: string | null;
          reviewedPrice: string;
          reviewedCurrency: string;
          reviewedDurationMinutes: number;
     }) => {
          setError(null);
          setSuccess(null);

          startTransition(async () => {
               const result = await rescheduleAppointmentByTokenAction(token, {
                    ...input,
                    idempotencyKey: crypto.randomUUID(),
               });

               if (!result.success) {
                    setError(result.error);
                    return;
               }

               setAppointment(result.data.appointment as PublicManagedAppointment);
               setResources([]);
               setShowReschedule(false);
               setSuccess("Appointment rescheduled successfully.");
          });
     };

     return (
          <Box sx={{ maxWidth: 920, mx: "auto", p: { xs: 2, sm: 3 }, display: "grid", gap: 2 }}>
               {error && <Alert severity="error">{error}</Alert>}
               {success && <Alert severity="success">{success}</Alert>}

               <ManagedAppointmentSummary appointment={appointment} />

               <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 } }}>
                    <ManagedAppointmentActions
                         appointment={appointment}
                         busy={isPending}
                         onCancel={() => setCancelOpen(true)}
                         onStartReschedule={() => setShowReschedule((prev) => !prev)}
                    />

                    {isTerminal && (
                         <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                              This appointment can no longer be changed online.
                         </Typography>
                    )}

                    {showReschedule && appointment.canReschedule && !isTerminal && (
                         <ManagedAppointmentRescheduleFlow
                              loading={isPending}
                              resources={resources}
                              onLoadAvailability={loadAvailability}
                              onConfirm={runReschedule}
                         />
                    )}
               </Paper>

               <ManagedAppointmentCancelDialog
                    open={cancelOpen}
                    busy={isPending}
                    onClose={() => setCancelOpen(false)}
                    onConfirm={runCancel}
               />
          </Box>
     );
}
