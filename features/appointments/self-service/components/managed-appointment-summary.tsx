import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { PublicManagedAppointment } from "../types";

export default function ManagedAppointmentSummary({
     appointment,
}: {
     appointment: PublicManagedAppointment;
}) {
     return (
          <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 } }}>
               <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Manage Appointment
               </Typography>
               <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {appointment.tenantName}
               </Typography>

               <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Appointment</Typography>
                         <Typography>{appointment.appointmentNumber}</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Status</Typography>
                         <Typography sx={{ textTransform: "capitalize" }}>{appointment.status.replace("_", " ")}</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Service</Typography>
                         <Typography>{appointment.serviceName}</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Location</Typography>
                         <Typography>{appointment.locationName}</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Team Member</Typography>
                         <Typography>{appointment.resourceName ?? "Available team member"}</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Date</Typography>
                         <Typography>{appointment.localDate}</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Time</Typography>
                         <Typography>
                              {appointment.localStartTime} - {appointment.localEndTime} ({appointment.timeZone})
                         </Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Duration</Typography>
                         <Typography>{appointment.durationMinutes} minutes</Typography>
                    </Box>
                    <Box>
                         <Typography variant="caption" color="text.secondary">Price</Typography>
                         <Typography>{appointment.price} {appointment.currency}</Typography>
                    </Box>
               </Box>
          </Paper>
     );
}
