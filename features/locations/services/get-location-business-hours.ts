import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LocationBusinessHour } from "../types/location-business-hour";
import type { DayOfWeek } from "@/lib/scheduling/scheduling-constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedFrom = { from: (table: string) => any };

type LbhRow = {
  id: string;
  tenant_id: string;
  location_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/**
 * Get weekly business hours for a location.
 * Ordered by day_of_week, start_time, sort_order.
 */
export async function getLocationBusinessHours(
  tenantId: string,
  locationId: string
): Promise<LocationBusinessHour[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("location_business_hours")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Unable to load location business hours");

  return ((data ?? []) as LbhRow[]).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    dayOfWeek: row.day_of_week as DayOfWeek,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get only active business hours for a location.
 */
export async function getActiveLocationBusinessHours(
  tenantId: string,
  locationId: string
): Promise<LocationBusinessHour[]> {
  const all = await getLocationBusinessHours(tenantId, locationId);
  return all.filter((h) => h.isActive);
}

/**
 * Check whether a location has any business hours configured.
 */
export async function hasLocationBusinessHours(
  tenantId: string,
  locationId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("location_business_hours")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("is_active", true)
    .limit(1);

  if (error) return false;
  return (data ?? []).length > 0;
}
