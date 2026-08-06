"use client";

/**
 * Calendar day view — Milestone 6.10.
 * Time axis vertically, resource columns horizontally.
 * Full implementation in Task #5.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import type { CalendarAppointment } from "../types/calendar";
import {
  getTimeAxisLabels,
  getCalendarTotalHeight,
  getAppointmentBlockPosition,
  resolveCalendarBounds,
  DEFAULT_CALENDAR_CONFIG,
} from "@/lib/scheduling/calendar-utils";
import CalendarAppointmentBlock from "./calendar-appointment-block";
import CalendarCurrentTimeIndicator from "./calendar-current-time-indicator";

type EntityOption = { id: string; name: string };

type Props = {
  appointments: CalendarAppointment[];
  resources: EntityOption[];
  localDate: string;
  timeZone: string;
  today: string;
  onAppointmentClick: (appt: CalendarAppointment) => void;
  onRescheduleRequest?: (appt: CalendarAppointment, newDate: string, newTime: string, newResourceId: string) => void;
  canEdit: boolean;
  tenantSlug: string;
};

export default function CalendarDayView({
  appointments,
  resources,
  localDate,
  timeZone,
  today,
  onAppointmentClick,
  onRescheduleRequest,
}: Props) {
  // Resolve calendar bounds (expand if appointments outside default range)
  const config = {
    ...DEFAULT_CALENDAR_CONFIG,
    ...resolveCalendarBounds(appointments, localDate, timeZone),
  };
  const totalHeight = getCalendarTotalHeight(config);
  const timeLabels = getTimeAxisLabels(config);
  const isToday = localDate === today;

  // Group appointments by resource
  const byResource = new Map<string, CalendarAppointment[]>();
  for (const appt of appointments) {
    const list = byResource.get(appt.resourceId) ?? [];
    list.push(appt);
    byResource.set(appt.resourceId, list);
  }

  // Determine visible resources (those with appointments or from filter)
  const visibleResources = resources.length > 0
    ? resources.slice(0, 20)
    : Array.from(byResource.keys()).map((id) => ({ id, name: byResource.get(id)?.[0]?.resourceName ?? id }));

  const columnWidth = visibleResources.length > 0
    ? `${Math.max(100 / visibleResources.length, 10)}%`
    : "100%";

  return (
    <Paper elevation={1} sx={{ overflow: "auto" }}>
      <Box sx={{ display: "flex", minWidth: visibleResources.length * 160 }}>
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

        {/* Resource columns */}
        {visibleResources.map((resource) => {
          const resourceAppts = byResource.get(resource.id) ?? [];

          return (
            <Box
              key={resource.id}
              sx={{
                flex: `0 0 ${columnWidth}`,
                minWidth: 140,
                position: "relative",
                height: totalHeight,
                borderRight: "1px solid",
                borderColor: "divider",
              }}
            >
              {/* Column header */}
              <Box sx={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                bgcolor: "background.paper",
                borderBottom: "1px solid",
                borderColor: "divider",
                px: 1,
                py: 0.5,
              }}>
                <Typography variant="caption" fontWeight={600} noWrap>
                  {resource.name}
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
              {resourceAppts.map((appt) => {
                const pos = getAppointmentBlockPosition(
                  appt.startsAt,
                  appt.endsAt,
                  localDate,
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
                    onDrop={onRescheduleRequest ? (newTop) => {
                      // Convert pixel position back to time
                      const minutesFromStart = newTop / config.pixelsPerMinute;
                      const absoluteMinutes = config.startHour * 60 + minutesFromStart;
                      const hours = Math.floor(absoluteMinutes / 60);
                      const mins = Math.round(absoluteMinutes % 60);
                      if (hours >= 0 && hours <= 23) {
                        const newTime = `${String(hours).padStart(2, "0")}:${String(Math.min(59, mins)).padStart(2, "0")}`;
                        onRescheduleRequest(appt, localDate, newTime, resource.id);
                      }
                    } : undefined}
                  />
                );
              })}
            </Box>
          );
        })}
      </Box>

      {/* Current time indicator */}
      {isToday && (
        <CalendarCurrentTimeIndicator
          timeZone={timeZone}
          config={config}
        />
      )}

      {/* Empty state */}
      {appointments.length === 0 && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No appointments for this date.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
