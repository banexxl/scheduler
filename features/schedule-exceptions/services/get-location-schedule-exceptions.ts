import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleException } from "../types/schedule-exception";

/**
 * Loads schedule exceptions for a location.
 * Range: past 30 days through next 365 days.
 * Ordered by exception_date ascending.
 */
export async function getLocationScheduleExceptions(
  tenantId: string,
  locationId: string
): Promise<ScheduleException[]> {
  const supabase = await createClient();

  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - 30);
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + 365);

  const fromDate = pastDate.toISOString().split("T")[0]!;
  const toDate = futureDate.toISOString().split("T")[0]!;

  const { data, error } = await supabase
    .from("location_schedule_exceptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .gte("exception_date", fromDate)
    .lte("exception_date", toDate)
    .order("exception_date", { ascending: true });

  if (error) {
    throw new Error("Unable to load schedule exceptions");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    locationId: row.location_id,
    tenantId: row.tenant_id,
    exceptionDate: row.exception_date,
    name: row.name,
    isClosed: row.is_closed,
    opensAt: row.opens_at ? row.opens_at.slice(0, 5) : null,
    closesAt: row.closes_at ? row.closes_at.slice(0, 5) : null,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
