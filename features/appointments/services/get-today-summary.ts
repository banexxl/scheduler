import "server-only";

/**
 * Today Appointment Summary — Milestone 8.3 / Performance 10.2.
 *
 * Uses SQL aggregation via RPC to return today's counts without
 * loading individual rows into Node.
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

  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  const { data } = await (supabase as never as Awaited<ReturnType<typeof createClient>>).rpc(
    "get_today_appointment_counts" as never,
    {
      p_tenant_id: tenantId,
      p_today_start: todayStart,
      p_today_end: todayEnd,
    } as never
  );

  if (!data) {
    return { total: 0, upcoming: 0, checkedIn: 0, inProgress: 0, completed: 0 };
  }

  const result = data as unknown as Record<string, unknown>;
  return {
    total: Number(result.total ?? 0),
    upcoming: Number(result.upcoming ?? 0),
    checkedIn: Number(result.checked_in ?? 0),
    inProgress: Number(result.in_progress ?? 0),
    completed: Number(result.completed ?? 0),
  };
}
