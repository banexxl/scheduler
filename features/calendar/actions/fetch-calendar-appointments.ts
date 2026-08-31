"use server";

/**
 * Server action to fetch calendar appointments for a date range.
 *
 * Used by the client-side calendar to load data without a full page re-render.
 * Loads a full month of appointments in a single request.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getCalendarAppointments } from "../services/get-calendar-appointments";
import type { CalendarAppointment } from "../types/calendar";
import type { AppointmentStatus } from "@/features/appointments/types/appointment";

export type FetchCalendarResult =
  | { success: true; appointments: CalendarAppointment[] }
  | { success: false; error: string };

export async function fetchCalendarAppointmentsAction(
  tenantSlug: string,
  input: {
    rangeStart: string;
    rangeEnd: string;
    locationId?: string | null;
    resourceId?: string | null;
    statuses?: AppointmentStatus[];
  }
): Promise<FetchCalendarResult> {
  try {
    const { tenant } = await requireTenantMember(tenantSlug);

    const appointments = await getCalendarAppointments({
      tenantId: tenant.id,
      startsBefore: input.rangeEnd,
      endsAfter: input.rangeStart,
      locationId: input.locationId,
      resourceId: input.resourceId,
      statuses: input.statuses,
    });

    return { success: true, appointments };
  } catch {
    return { success: false, error: "Failed to load calendar data." };
  }
}
