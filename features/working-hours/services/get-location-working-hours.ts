import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { WorkingHoursDay } from "../types/working-hours";
import { ORDERED_DAYS } from "../types/working-hours";

/**
 * Loads working hours for a location, ordered Monday–Sunday.
 * Returns null if data is incomplete (fewer than 7 rows).
 */
export async function getLocationWorkingHours(
  locationId: string
): Promise<WorkingHoursDay[] | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("location_working_hours")
    .select("day_of_week, is_closed, opens_at, closes_at")
    .eq("location_id", locationId)
    .order("day_of_week", { ascending: true });

  if (error || !data || data.length < 7) {
    return null;
  }

  // Reorder: Monday first, Sunday last
  const byDay = new Map(data.map((d) => [d.day_of_week, d]));

  const ordered: WorkingHoursDay[] = ORDERED_DAYS.map((day) => {
    const row = byDay.get(day);
    if (!row) {
      return { dayOfWeek: day, isClosed: true, opensAt: null, closesAt: null };
    }
    return {
      dayOfWeek: row.day_of_week,
      isClosed: row.is_closed,
      opensAt: row.opens_at ? row.opens_at.slice(0, 5) : null, // "HH:mm"
      closesAt: row.closes_at ? row.closes_at.slice(0, 5) : null,
    };
  });

  return ordered;
}
