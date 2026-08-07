import "server-only";

/**
 * Today Appointment Summary — Milestone 8.3.
 *
 * Lightweight query returning only today's appointment counts by status.
 * Used on the business dashboard card without loading full appointment data.
 */

import { createClient } from "@/lib/supabase/server";
import { getTenantToday } from "@/lib/scheduling/calendar-utils";

export type TodaySummary = {
  total: number;
  upcoming: number;
  checkedIn: number;
  inProgress: number;
  completed: number;
};

export async function getTodaySummary(
  tenantId: string,
  timeZone: string
): Promise<TodaySummary> {
  const supabase = await createClient();
  const today = getTenantToday(new Date(), timeZone);

  const { data, error } = await supabase
    .from("appointments")
    .select("status")
    .eq("tenant_id", tenantId)
    .gte("starts_at", `${today}T00:00:00.000Z`)
    .lt("starts_at", `${today}T23:59:59.999Z`)
    .neq("status", "cancelled");

  if (error || !data) {
    return { total: 0, upcoming: 0, checkedIn: 0, inProgress: 0, completed: 0 };
  }

  const rows = data as Array<{ status: string }>;
  return {
    total: rows.length,
    upcoming: rows.filter((r) => r.status === "pending" || r.status === "confirmed").length,
    checkedIn: rows.filter((r) => r.status === "checked_in").length,
    inProgress: rows.filter((r) => r.status === "in_progress").length,
    completed: rows.filter((r) => r.status === "completed").length,
  };
}
