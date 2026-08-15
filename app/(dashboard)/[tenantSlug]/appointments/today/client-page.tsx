"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Box, Chip, Paper, Stack, Typography, Divider } from "@mui/material";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { TodayAppointmentsResult } from "@/features/appointments/services/get-today-appointments";
import AppointmentQuickActions from "@/features/appointments/components/appointment-quick-actions";
import { getAppointmentOperationalState } from "@/features/appointments/utils/appointment-operational-state";

export default function TodayAppointmentsClientPage({
     tenantSlug,
     timeZone,
     initialData,
     initialFilters,
}: {
     tenantSlug: string;
     timeZone: string;
     initialData: TodayAppointmentsResult;
     initialFilters: { locationId?: string; resourceId?: string; status?: string };
}) {
     const appointments = initialData.appointments;
     const summary = initialData.summary;

     const grouped = useMemo(() => {
          const byStatus = new Map<string, typeof appointments>();
          appointments.forEach((appointment) => {
               const group = byStatus.get(appointment.status) ?? [];
               group.push(appointment);
               byStatus.set(appointment.status, group);
          });
          return Array.from(byStatus.entries());
     }, [appointments]);

     const formatTime = (value: string) => {
          const zoned = toZonedTime(new Date(value), timeZone);
          return format(zoned, "HH:mm");
     };

     return (
          <Box sx={{ display: "grid", gap: 2 }}>
               <Paper sx={{ p: 3 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
                         <Box>
                              <Typography variant="h5">Today&apos;s appointments</Typography>
                              <Typography variant="body2" color="text.secondary">
                                   {initialData.date} • {timeZone}
                              </Typography>
                         </Box>
                         <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Chip label={`Total ${summary.total}`} color="primary" variant="outlined" />
                              <Chip label={`Upcoming ${summary.upcoming}`} color="info" variant="outlined" />
                              <Chip label={`Checked in ${summary.checkedIn}`} color="success" variant="outlined" />
                              <Chip label={`In progress ${summary.inProgress}`} color="warning" variant="outlined" />
                         </Stack>
                    </Stack>
               </Paper>

               <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                         Daily workflow
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                         Review today&apos;s appointments, identify delays, and jump into the appointment detail view for quick follow-up.
                    </Typography>

                    {appointments.length === 0 ? (
                         <Typography color="text.secondary">No appointments for today.</Typography>
                    ) : (
                         <Stack spacing={2}>
                              {grouped.map(([status, items]) => (
                                   <Box key={status}>
                                        <Typography variant="subtitle1" sx={{ textTransform: "capitalize", mb: 1 }}>
                                             {status.replace(/_/g, " ")}
                                        </Typography>
                                        <Stack spacing={1.25}>
                                             {items.map((appointment) => (
                                                  <Paper key={appointment.id} variant="outlined" sx={{ p: 2 }}>
                                                       <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
                                                            <Box>
                                                                 <Typography variant="subtitle2">{appointment.customerName}</Typography>
                                                                 <Typography variant="body2" color="text.secondary">
                                                                      {appointment.serviceNameSnapshot} • {appointment.locationNameSnapshot}
                                                                 </Typography>
                                                                 <Typography variant="body2" color="text.secondary">
                                                                      {appointment.resourceNameSnapshot ? `Resource: ${appointment.resourceNameSnapshot}` : "No resource assigned"}
                                                                 </Typography>
                                                                 <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                                      {getAppointmentOperationalState(
                                                                           {
                                                                                status: appointment.status,
                                                                                startsAt: appointment.startsAt,
                                                                                endsAt: appointment.endsAt,
                                                                                checkedInAt: appointment.checkedInAt,
                                                                                serviceStartedAt: appointment.serviceStartedAt,
                                                                                completedAt: appointment.completedAt,
                                                                                noShowAt: appointment.noShowAt,
                                                                           },
                                                                           new Date(),
                                                                           timeZone
                                                                      ).label}
                                                                 </Typography>
                                                            </Box>
                                                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }}>
                                                                 <Typography variant="body2" color="text.secondary">
                                                                      {formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)}
                                                                 </Typography>
                                                                 <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
                                                                      <AppointmentQuickActions tenantSlug={tenantSlug} appointmentId={appointment.id} currentStatus={appointment.status as "pending" | "confirmed" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show"} />
                                                                      <Link href={`/${tenantSlug}/appointments/${appointment.id}`}>
                                                                           <Typography color="primary">Open appointment</Typography>
                                                                      </Link>
                                                                 </Stack>
                                                            </Stack>
                                                       </Stack>
                                                  </Paper>
                                             ))}
                                        </Stack>
                                   </Box>
                              ))}
                         </Stack>
                    )}
               </Paper>

               <Paper sx={{ p: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>Quick filters</Typography>
                    <Typography variant="body2" color="text.secondary">
                         The route is ready for location, resource, and status filters. Use query params to narrow the list.
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2">Current filters: {JSON.stringify(initialFilters)}</Typography>
               </Paper>
          </Box>
     );
}
