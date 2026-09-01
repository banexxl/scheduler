"use client";

/**
 * Main appointment calendar orchestrator — Milestone 6.10.
 *
 * All view/date/filter state is managed client-side. The server provides
 * a full month of appointments on initial load. When the user navigates
 * outside the loaded range, new data is fetched via server action.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import type { CalendarAppointment } from "../types/calendar";
import type { CalendarView } from "../types/calendar";
import CalendarToolbar from "./calendar-toolbar";
import CalendarDayView from "./calendar-day-view";
import CalendarWeekView from "./calendar-week-view";
import CalendarAppointmentDrawer from "./calendar-appointment-drawer";
import CalendarRescheduleDialog from "./calendar-reschedule-dialog";
import CalendarLegend from "./calendar-legend";
import CalendarMobileAgenda from "./calendar-mobile-agenda";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import {
  getTenantDayRange,
  getTenantWeekRange,
  getTenantMonthRange,
} from "@/lib/scheduling/calendar-utils";
import { fetchCalendarAppointmentsAction } from "../actions/fetch-calendar-appointments";

type EntityOption = { id: string; name: string };

type Props = {
  tenantSlug: string;
  timeZone: string;
  today: string;
  initialAppointments: CalendarAppointment[];
  initialRangeStart: string;
  initialRangeEnd: string;
  locations: EntityOption[];
  resources: EntityOption[];
  canEdit: boolean;
};

export default function AppointmentCalendar({
  tenantSlug,
  timeZone,
  today,
  initialAppointments,
  locations,
  resources,
  canEdit,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // ─── Client-side state (no URL query params) ──────────────────────────────
  const [view, setView] = useState<CalendarView>("day");
  const [date, setDate] = useState(today);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);

  // ─── Appointment data cache ────────────────────────────────────────────────
  const [allAppointments, setAllAppointments] = useState(initialAppointments);
  const [isFetching, setIsFetching] = useState(false);

  // Track the current loaded month key to know when we need to refetch
  const loadedMonthRef = useRef(today.slice(0, 7)); // "YYYY-MM"

  // ─── Drawer state ──────────────────────────────────────────────────────────
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ─── Reschedule dialog state ───────────────────────────────────────────────
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<{
    appointment: CalendarAppointment;
    newLocalDate: string;
    newLocalStartTime: string;
    newResourceId: string;
  } | null>(null);

  // ─── Fetch new month data when navigating outside loaded range ─────────────
  const fetchMonthData = useCallback(
    async (targetDate: string) => {
      const targetMonth = targetDate.slice(0, 7);
      if (targetMonth === loadedMonthRef.current && !isFetching) return;

      setIsFetching(true);
      const monthRange = getTenantMonthRange(targetDate, timeZone);

      const result = await fetchCalendarAppointmentsAction(tenantSlug, {
        rangeStart: monthRange.start,
        rangeEnd: monthRange.end,
      });

      if (result.success) {
        setAllAppointments(result.appointments);
        loadedMonthRef.current = targetMonth;
      }
      setIsFetching(false);
    },
    [tenantSlug, timeZone, isFetching]
  );

  // Check if we need to fetch when date changes
  useEffect(() => {
    const currentMonth = date.slice(0, 7);
    if (currentMonth !== loadedMonthRef.current) {
      fetchMonthData(date);
    }
  }, [date, fetchMonthData]);

  // ─── Filter appointments for the visible range ─────────────────────────────
  const visibleAppointments = useMemo(() => {
    let rangeStart: string;
    let rangeEnd: string;

    if (view === "week") {
      const weekRange = getTenantWeekRange(date, timeZone);
      rangeStart = weekRange.start;
      rangeEnd = weekRange.end;
    } else {
      const dayRange = getTenantDayRange(date, timeZone);
      rangeStart = dayRange.start;
      rangeEnd = dayRange.end;
    }

    return allAppointments.filter((appt) => {
      // Overlap check: starts_at < rangeEnd AND ends_at > rangeStart
      if (appt.startsAt >= rangeEnd) return false;
      if (appt.endsAt <= rangeStart) return false;

      // Apply location filter
      if (locationId && appt.locationId !== locationId) return false;

      // Apply resource filter
      if (resourceId && appt.resourceId !== resourceId) return false;

      return true;
    });
  }, [allAppointments, view, date, timeZone, locationId, resourceId]);

  // Filter resources by selected location
  const filteredResources = useMemo(() => {
    // For now show all resources — location-based filtering was done server-side before.
    // Since we load all appointments, just show all resources.
    return resources;
  }, [resources]);

  // ─── Navigation callbacks ──────────────────────────────────────────────────
  const handleViewChange = useCallback((newView: CalendarView) => {
    setView(newView);
  }, []);

  const handleDateChange = useCallback((newDate: string) => {
    setDate(newDate);
  }, []);

  const handleLocationChange = useCallback((newLocationId: string | null) => {
    setLocationId(newLocationId);
    setResourceId(null); // Reset resource when location changes
  }, []);

  const handleResourceChange = useCallback((newResourceId: string | null) => {
    setResourceId(newResourceId);
  }, []);

  // ─── Appointment interactions ──────────────────────────────────────────────
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
    // Refetch current month to get updated data
    loadedMonthRef.current = ""; // Force refetch
    fetchMonthData(date);
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
        view={view}
        date={date}
        today={today}
        locationId={locationId}
        resourceId={resourceId}
        locations={locations}
        resources={filteredResources}
        onViewChange={handleViewChange}
        onDateChange={handleDateChange}
        onLocationChange={handleLocationChange}
        onResourceChange={handleResourceChange}
        isFetching={isFetching}
      />

      <Box sx={{ mt: 2 }}>
        {isMobile ? (
          <CalendarMobileAgenda
            appointments={visibleAppointments}
            timeZone={timeZone}
            localDate={date}
            onAppointmentClick={handleAppointmentClick}
          />
        ) : view === "day" ? (
          <CalendarDayView
            appointments={visibleAppointments}
            resources={filteredResources}
            localDate={date}
            timeZone={timeZone}
            today={today}
            onAppointmentClick={handleAppointmentClick}
            onRescheduleRequest={canEdit ? handleRescheduleRequest : undefined}
            canEdit={canEdit}
            tenantSlug={tenantSlug}
          />
        ) : (
          <CalendarWeekView
            appointments={visibleAppointments}
            localDate={date}
            timeZone={timeZone}
            today={today}
            resourceId={resourceId}
            resources={filteredResources}
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
