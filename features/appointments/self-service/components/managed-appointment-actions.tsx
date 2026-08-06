"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type { PublicManagedAppointment } from "../types";

export default function ManagedAppointmentActions({
     appointment,
     onCancel,
     onStartReschedule,
     busy,
}: {
     appointment: PublicManagedAppointment;
     onCancel: () => void;
     onStartReschedule: () => void;
     busy: boolean;
}) {
     return (
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
               <Typography variant="h6">Actions</Typography>
               <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                    <Button
                         variant="outlined"
                         color="error"
                         disabled={!appointment.canCancel || busy}
                         onClick={onCancel}
                    >
                         Cancel appointment
                    </Button>
                    <Button
                         variant="contained"
                         disabled={!appointment.canReschedule || busy}
                         onClick={onStartReschedule}
                    >
                         Reschedule appointment
                    </Button>
               </Box>

               {appointment.cancellationDeadline && appointment.canCancel && (
                    <Typography variant="body2" color="text.secondary">
                         You can cancel until {new Date(appointment.cancellationDeadline).toLocaleString()}.
                    </Typography>
               )}

               {appointment.rescheduleDeadline && appointment.canReschedule && (
                    <Typography variant="body2" color="text.secondary">
                         You can reschedule until {new Date(appointment.rescheduleDeadline).toLocaleString()}.
                    </Typography>
               )}
          </Box>
     );
}
