"use client";

/**
 * Calendar week view — Milestone 6.10.
 * One selected resource across 7 tenant-local date columns.
 * Full implementation in Task #6.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import type { CalendarAppointment } from "../types/calendar";
import {
  getTenantWeekDates,
  getTimeAxisLabels,
  getCalendarTotalHeight,
  getAppointmentBlockPosition,
  resolveCalendarBounds,
  DEFAULT_CALENDAR_CONFIG,
} from "@/lib/scheduling/calendar-utils";
import CalendarAppointmentBlock from "./calendar-appointment-block";

type EntityOption = { id: string; name: string };

type Props = {
  appointments: CalendarAppointment[];
  localDate: string;
  timeZone: string;
  today: string;
  resourceId: string | null;
  resources: EntityOption[];
  onAppointmentClick: (appt: CalendarAppointment) => void;
  canEdit: boolean;
  tenantSlug: string;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarWeekView({
  appointments,
  localDate,
  timeZone,
  today,
  resourceId,
  resources,
  onAppointmentClick,
}: Props) {
  const weekDates = getTenantWeekDates(localDate, timeZone);

  // Week view requires or defaults to one selected resource
  const selectedResource = resourceId
    ? resources.find((r) => r.id === resourceId)
    : resources[0];

  if (!selectedResource) {
    return (
      <Alert severity="info">
        Select a resource to view the week calendar.
      </Alert>
    );
  }

  // Filter appointments for selected resource
  const resourceAppointments = appointments.filter(
    (a) => a.resourceId === selectedResource.id
  );

  const config = {
    ...DEFAULT_CALENDAR_CONFIG,
    ...resolveCalendarBounds(resourceAppointments, localDate, timeZone),
  };
  const totalHeight = getCalendarTotalHeight(config);
  const timeLabels = getTimeAxisLabels(config);

  // Group by date
  const byDate = new Map<string, CalendarAppointment[]>();
  for (const date of weekDates) {
    byDate.set(date, []);
  }
  for (const appt of resourceAppointments) {
    // Determine which day column this appointment belongs to
    // Use the date portion of startsAt in tenant timezone
    const apptDate = new Date(appt.startsAt);
    const zonedStr = apptDate.toLocaleDateString("sv-SE", { timeZone }); // YYYY-MM-DD format
    const list = byDate.get(zonedStr);
    if (list) list.push(appt);
  }

  return (
    <Paper elevation={1} sx={{ overflow: "auto" }}>
      <Box sx={{ mb: 1, px: 2, pt: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Resource: {selectedResource.name}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", minWidth: 800, pt: "12px" }}>
        {/* Time axis */}
        <Box sx={{ width: 60, flexShrink: 0, position: "relative", height: totalHeight, borderRight: "1px solid", borderColor: "divider" }}>
          {timeLabels.map((label) => (
            <Typography
              key={label.hour}
              variant="caption"
              sx={{
                position: "absolute",
                top: label.offsetPx,
                right: 4,
                color: "text.secondary",
                fontSize: "0.7rem",
                lineHeight: 1,
                transform: "translateY(-50%)",
              }}
            >
              {label.label}
            </Typography>
          ))}
        </Box>

        {/* Day columns */}
        {weekDates.map((date, idx) => {
          const dayAppts = byDate.get(date) ?? [];
          const isToday = date === today;
          const dayLabel = DAY_LABELS[idx];
          const shortDate = date.slice(5); // MM-DD

          return (
            <Box
              key={date}
              sx={{
                flex: "1 1 0",
                minWidth: 100,
                position: "relative",
                height: totalHeight,
                borderRight: "1px solid",
                borderColor: "divider",
                bgcolor: isToday ? "action.hover" : undefined,
              }}
            >
              {/* Day header */}
              <Box sx={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                bgcolor: isToday ? "primary.50" : "background.paper",
                borderBottom: "1px solid",
                borderColor: "divider",
                px: 0.5,
                py: 0.5,
                textAlign: "center",
              }}>
                <Typography variant="caption" fontWeight={isToday ? 700 : 400}>
                  {dayLabel}
                </Typography>
                <Typography variant="caption" display="block" color={isToday ? "primary.main" : "text.secondary"} fontSize="0.65rem">
                  {shortDate}
                </Typography>
              </Box>

              {/* Hour grid lines */}
              {timeLabels.map((label) => (
                <Box
                  key={label.hour}
                  sx={{
                    position: "absolute",
                    top: label.offsetPx,
                    left: 0,
                    right: 0,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    opacity: 0.3,
                  }}
                />
              ))}

              {/* Appointment blocks */}
              {dayAppts.map((appt) => {
                const pos = getAppointmentBlockPosition(
                  appt.startsAt,
                  appt.endsAt,
                  date,
                  timeZone,
                  config
                );

                return (
                  <CalendarAppointmentBlock
                    key={appt.id}
                    appointment={appt}
                    top={pos.top}
                    height={pos.height}
                    onClick={() => onAppointmentClick(appt)}
                  />
                );
              })}
            </Box>
          );
        })}
      </Box>

      {resourceAppointments.length === 0 && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No appointments this week for {selectedResource.name}.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
