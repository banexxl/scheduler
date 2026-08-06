import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ResourceWorkingHourWithLocation,
  DayOfWeek,
} from "../types/resource-working-hour";

// Temporary untyped client interface until resource_working_hours is in generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedFrom = { from: (table: string) => any };

type RwhRow = {
  id: string;
  tenant_id: string;
  resource_id: string;
  location_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/**
 * Get the full weekly schedule for a resource.
 * Ordered by day_of_week, start_time, sort_order.
 */
export async function getResourceWorkingHours(
  tenantId: string,
  resourceId: string
): Promise<ResourceWorkingHourWithLocation[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("resource_working_hours")
    .select("*, locations(name)")
    .eq("tenant_id", tenantId)
    .eq("resource_id", resourceId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Unable to load resource working hours");

  return ((data ?? []) as (RwhRow & { locations: { name: string } | null })[]).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    resourceId: row.resource_id,
    locationId: row.location_id,
    dayOfWeek: row.day_of_week as DayOfWeek,
    startTime: row.start_time.slice(0, 5), // "HH:mm:ss" → "HH:mm"
    endTime: row.end_time.slice(0, 5),
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    locationName: row.locations?.name ?? null,
  }));
}

/**
 * Get only active working hours for a resource.
 */
export async function getActiveResourceWorkingHours(
  tenantId: string,
  resourceId: string
): Promise<ResourceWorkingHourWithLocation[]> {
  const all = await getResourceWorkingHours(tenantId, resourceId);
  return all.filter((h) => h.isActive);
}

/**
 * Get working hours filtered by location.
 */
export async function getResourceWorkingHoursByLocation(
  tenantId: string,
  resourceId: string,
  locationId: string | null
): Promise<ResourceWorkingHourWithLocation[]> {
  const all = await getResourceWorkingHours(tenantId, resourceId);
  return all.filter((h) =>
    locationId === null ? h.locationId === null : h.locationId === locationId
  );
}

/**
 * Check whether a resource has any working hours defined.
 */
export async function hasResourceWorkingHours(
  tenantId: string,
  resourceId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("resource_working_hours")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("resource_id", resourceId)
    .eq("is_active", true)
    .limit(1);

  if (error) return false;
  return (data ?? []).length > 0;
}
