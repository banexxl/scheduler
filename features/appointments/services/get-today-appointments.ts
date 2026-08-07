import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getTenantToday } from "@/lib/scheduling/calendar-utils";

export type TodayAppointmentItem = {
     id: string;
     appointmentNumber: string;
     tenantId: string;
     customerName: string;
     serviceNameSnapshot: string;
     locationNameSnapshot: string;
     resourceNameSnapshot: string;
     status: string;
     startsAt: string;
     endsAt: string;
     checkedInAt: string | null;
     serviceStartedAt: string | null;
     completedAt: string | null;
     noShowAt: string | null;
};

export type TodayAppointmentsResult = {
     date: string;
     appointments: TodayAppointmentItem[];
     summary: {
          total: number;
          upcoming: number;
          checkedIn: number;
          inProgress: number;
          completed: number;
          cancelled: number;
          noShow: number;
     };
};

export async function getTodayAppointments(
     tenantId: string,
     timeZone: string,
     filters: { locationId?: string; resourceId?: string; status?: string } = {}
): Promise<TodayAppointmentsResult> {
     const supabase = await createClient();
     const today = getTenantToday(new Date(), timeZone);

     let query = supabase
          .from("appointments")
          .select("id, tenant_id, appointment_number, customer_name, service_name_snapshot, location_name_snapshot, resource_name_snapshot, status, starts_at, ends_at, checked_in_at, service_started_at, completed_at, no_show_at")
          .eq("tenant_id", tenantId)
          .gte("starts_at", `${today}T00:00:00.000Z`)
          .lt("starts_at", `${today}T23:59:59.999Z`);

     if (filters.locationId) query = query.eq("location_id", filters.locationId);
     if (filters.resourceId) query = query.eq("resource_id", filters.resourceId);
     if (filters.status) query = query.eq("status", filters.status);

     const { data, error } = await query.order("starts_at", { ascending: true });

     if (error || !data) {
          return {
               date: today,
               appointments: [],
               summary: { total: 0, upcoming: 0, checkedIn: 0, inProgress: 0, completed: 0, cancelled: 0, noShow: 0 },
          };
     }

     const appointments = ((data as unknown) as Array<Record<string, unknown>>).map((row) => ({
          id: row.id as string,
          appointmentNumber: row.appointment_number as string,
          tenantId: row.tenant_id as string,
          customerName: row.customer_name as string,
          serviceNameSnapshot: row.service_name_snapshot as string,
          locationNameSnapshot: row.location_name_snapshot as string,
          resourceNameSnapshot: row.resource_name_snapshot as string,
          status: row.status as string,
          startsAt: row.starts_at as string,
          endsAt: row.ends_at as string,
          checkedInAt: (row.checked_in_at as string) ?? null,
          serviceStartedAt: (row.service_started_at as string) ?? null,
          completedAt: (row.completed_at as string) ?? null,
          noShowAt: (row.no_show_at as string) ?? null,
     }));

     const summary = {
          total: appointments.length,
          upcoming: appointments.filter((appointment) => appointment.status === "confirmed" || appointment.status === "pending").length,
          checkedIn: appointments.filter((appointment) => appointment.status === "checked_in").length,
          inProgress: appointments.filter((appointment) => appointment.status === "in_progress").length,
          completed: appointments.filter((appointment) => appointment.status === "completed").length,
          cancelled: appointments.filter((appointment) => appointment.status === "cancelled").length,
          noShow: appointments.filter((appointment) => appointment.status === "no_show").length,
     };

     return { date: today, appointments, summary };
}
