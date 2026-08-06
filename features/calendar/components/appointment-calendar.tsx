"use client";

/**
 * Main appointment calendar orchestrator — Milestone 6.10.
 *
 * Coordinates the toolbar, day/week views, appointment drawer,
 * and drag-and-drop rescheduling interactions.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import { useRouter } from "next/navigation";
import type { CalendarAppointment, CalendarFilters } from "../types/calendar";
import CalendarToolbar from "./calendar-toolbar";
import CalendarDayView from "./calendar-day-view";
import CalendarWeekView from "./calendar-week-view";
import CalendarAppointmentDrawer from "./calendar-appointment-drawer";
import CalendarRescheduleDialog from "./calendar-reschedule-dialog";
import CalendarLegend from "./calendar-legend";
import CalendarMobileAgenda from "./calendar-mobile-agenda";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

type EntityOption = { id: string; name: string };

type Props = {
  tenantSlug: string;
  timeZone: string;
  today: string;
  appointments: CalendarAppointment[];
  locations: EntityOption[];
  resources: EntityOption[];
  filters: CalendarFilters;
  canEdit: boolean;
};

export default function AppointmentCalendar({
  tenantSlug,
  timeZone,
  today,
  appointments,
  locations,
  resources,
  filters,
  canEdit,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Reschedule dialog state
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<{
    appointment: CalendarAppointment;
    newLocalDate: string;
    newLocalStartTime: string;
    newResourceId: string;
  } | null>(null);

  function handleAppointmentClick(appointment: CalendarAppointment) {
    setSelectedAppointment(appointment);
    setDrawerOpen(true);
  }

  function handleDrawerClose() {
    setDrawerOpen(false);
    setSelectedAppointment(null);
  }

  function handleRescheduleRequest(
    appointment: CalendarAppointment,
    newLocalDate: string,
    newLocalStartTime: string,
    newResourceId: string
  ) {
    setRescheduleTarget({ appointment, newLocalDate, newLocalStartTime, newResourceId });
    setRescheduleOpen(true);
  }

  function handleRescheduleSuccess() {
    setRescheduleOpen(false);
    setRescheduleTarget(null);
    // Refresh the page to reload appointments
    startTransition(() => router.refresh());
  }

  function handleRescheduleClose() {
    setRescheduleOpen(false);
    setRescheduleTarget(null);
  }

  const rescheduleAppointment = rescheduleTarget?.appointment ?? null;
  const newResourceName = rescheduleTarget
    ? (resources.find((r) => r.id === rescheduleTarget.newResourceId)?.name ?? "Unknown")
    : "";

  return (
    <Box>
      <CalendarToolbar
        tenantSlug={tenantSlug}
        filters={filters}
        today={today}
        locations={locations}
        resources={resources}
      />

      <Box sx={{ mt: 2 }}>
        {isMobile ? (
          <CalendarMobileAgenda
            appointments={appointments}
            timeZone={timeZone}
            localDate={filters.date}
            onAppointmentClick={handleAppointmentClick}
          />
        ) : filters.view === "day" ? (
          <CalendarDayView
            appointments={appointments}
            resources={resources}
            localDate={filters.date}
            timeZone={timeZone}
            today={today}
            onAppointmentClick={handleAppointmentClick}
            onRescheduleRequest={canEdit ? handleRescheduleRequest : undefined}
            canEdit={canEdit}
            tenantSlug={tenantSlug}
          />
        ) : (
          <CalendarWeekView
            appointments={appointments}
            localDate={filters.date}
            timeZone={timeZone}
            today={today}
            resourceId={filters.resourceId}
            resources={resources}
            onAppointmentClick={handleAppointmentClick}
            canEdit={canEdit}
            tenantSlug={tenantSlug}
          />
        )}
      </Box>

      <CalendarLegend />

      <CalendarAppointmentDrawer
        appointment={selectedAppointment}
        open={drawerOpen}
        onClose={handleDrawerClose}
        tenantSlug={tenantSlug}
        timeZone={timeZone}
        canEdit={canEdit}
      />

      <CalendarRescheduleDialog
        open={rescheduleOpen}
        onClose={handleRescheduleClose}
        onSuccess={handleRescheduleSuccess}
        tenantSlug={tenantSlug}
        appointment={rescheduleAppointment}
        newLocalDate={rescheduleTarget?.newLocalDate ?? ""}
        newLocalStartTime={rescheduleTarget?.newLocalStartTime ?? ""}
        newResourceId={rescheduleTarget?.newResourceId ?? ""}
        newResourceName={newResourceName}
      />
    </Box>
  );
}
