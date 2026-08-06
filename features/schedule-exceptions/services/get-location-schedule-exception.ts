import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleException } from "../types/schedule-exception";

/**
 * Loads a single schedule exception by ID, verifying tenant and location scope.
 */
export async function getLocationScheduleException(
  tenantId: string,
  locationId: string,
  exceptionId: string
): Promise<ScheduleException | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("location_schedule_exceptions")
    .select("*")
    .eq("id", exceptionId)
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    locationId: data.location_id,
    tenantId: data.tenant_id,
    exceptionDate: data.exception_date,
    name: data.name,
    isClosed: data.is_closed,
    opensAt: data.opens_at ? data.opens_at.slice(0, 5) : null,
    closesAt: data.closes_at ? data.closes_at.slice(0, 5) : null,
    notes: data.notes,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
