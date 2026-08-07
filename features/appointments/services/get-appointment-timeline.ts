import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AppointmentTimelineItem = {
     id: string;
     type: string;
     occurredAt: string;
     title: string;
     description?: string | null;
};

export async function getAppointmentTimeline(tenantId: string, appointmentId: string): Promise<AppointmentTimelineItem[]> {
     const supabase = await createClient();
     const { data, error } = await supabase
          .from("appointments")
          .select("id, created_at, updated_at, status, cancelled_at, starts_at")
          .eq("tenant_id", tenantId)
          .eq("id", appointmentId)
          .maybeSingle();

     if (error || !data) return [];

     const items: AppointmentTimelineItem[] = [
          {
               id: `${appointmentId}-created`,
               type: "created",
               occurredAt: (data.created_at as string) ?? (data.updated_at as string),
               title: "Appointment created",
               description: "The appointment was created.",
          },
     ];

     if ((data.status as string) === "cancelled") {
          items.push({
               id: `${appointmentId}-cancelled`,
               type: "cancelled",
               occurredAt: (data.cancelled_at as string) ?? (data.updated_at as string),
               title: "Appointment cancelled",
               description: "The appointment was cancelled.",
          });
     }

     if ((data.status as string) === "completed") {
          items.push({
               id: `${appointmentId}-completed`,
               type: "status_changed",
               occurredAt: (data.updated_at as string),
               title: "Appointment completed",
               description: "The appointment was completed.",
          });
     }

     return items.sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
}
