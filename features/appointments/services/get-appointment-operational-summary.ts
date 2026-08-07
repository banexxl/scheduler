import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getAppointmentOperationalSummary(tenantId: string) {
     const supabase = await createClient();

     const { data, error } = await supabase
          .from("appointments")
          .select("status")
          .eq("tenant_id", tenantId);

     if (error || !data) {
          return { total: 0, upcoming: 0, checkedIn: 0, inProgress: 0, completed: 0, cancelled: 0, noShow: 0 };
     }

     const appointments = data as Array<{ status: string }>;
     return {
          total: appointments.length,
          upcoming: appointments.filter((appointment) => appointment.status === "confirmed" || appointment.status === "pending").length,
          checkedIn: appointments.filter((appointment) => appointment.status === "checked_in").length,
          inProgress: appointments.filter((appointment) => appointment.status === "in_progress").length,
          completed: appointments.filter((appointment) => appointment.status === "completed").length,
          cancelled: appointments.filter((appointment) => appointment.status === "cancelled").length,
          noShow: appointments.filter((appointment) => appointment.status === "no_show").length,
     };
}
