import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AppointmentStatusHistoryItem = {
     fromStatus: string;
     toStatus: string;
     changedAt: string;
};

export async function getAppointmentStatusHistory(
     tenantId: string,
     appointmentId: string
): Promise<AppointmentStatusHistoryItem[]> {
     const supabase = await createClient();

     try {
          const { data, error } = await supabase
               .from("appointments")
               .select("id")
               .eq("tenant_id", tenantId)
               .eq("id", appointmentId)
               .single();

          if (error || !data) {
               return [];
          }

          const { data: historyRows, error: historyError } = await (supabase as typeof supabase & {
               from: (relation: string) => ReturnType<typeof supabase.from>;
          }).from("appointment_status_history")
               .select("from_status, to_status, changed_at")
               .eq("tenant_id", tenantId)
               .eq("appointment_id", appointmentId)
               .order("changed_at", { ascending: true });

          if (historyError || !historyRows) {
               return [];
          }

          return (historyRows as Array<Record<string, unknown>>).map((row) => ({
               fromStatus: row.from_status as string,
               toStatus: row.to_status as string,
               changedAt: row.changed_at as string,
          }));
     } catch {
          return [];
     }
}