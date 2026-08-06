import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ResourceTimeOffWithLocation } from "../types/resource-time-off";

// Temporary untyped client interface until resource_time_off is in generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedFrom = { from: (table: string) => any };

type RtoRow = {
  id: string;
  tenant_id: string;
  resource_id: string;
  location_id: string | null;
  title: string | null;
  notes: string | null;
  starts_at: string;
  ends_at: string;
  is_all_day: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Get future time off for a resource (starts_at >= now).
 * Ordered by starts_at ascending.
 */
export async function getFutureResourceTimeOff(
  tenantId: string,
  resourceId: string
): Promise<ResourceTimeOffWithLocation[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("resource_time_off")
    .select("*, locations(name)")
    .eq("tenant_id", tenantId)
    .eq("resource_id", resourceId)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw new Error("Unable to load resource time off");

  return mapRows(data ?? []);
}

/**
 * Get time off within a date range for a resource.
 * Includes any entry that overlaps with [rangeStart, rangeEnd).
 */
export async function getResourceTimeOffInRange(
  tenantId: string,
  resourceId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<ResourceTimeOffWithLocation[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("resource_time_off")
    .select("*, locations(name)")
    .eq("tenant_id", tenantId)
    .eq("resource_id", resourceId)
    .lt("starts_at", rangeEnd)
    .gt("ends_at", rangeStart)
    .order("starts_at", { ascending: true });

  if (error) throw new Error("Unable to load resource time off for range");

  return mapRows(data ?? []);
}

/**
 * Get a single time-off record by ID.
 */
export async function getResourceTimeOffById(
  tenantId: string,
  timeOffId: string
): Promise<ResourceTimeOffWithLocation | null> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("resource_time_off")
    .select("*, locations(name)")
    .eq("tenant_id", tenantId)
    .eq("id", timeOffId)
    .single();

  if (error || !data) return null;
  return mapRow(data as RtoRow & { locations: { name: string } | null });
}

/**
 * Get all time off for a resource (including past).
 * Ordered by starts_at descending.
 */
export async function getAllResourceTimeOff(
  tenantId: string,
  resourceId: string
): Promise<ResourceTimeOffWithLocation[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("resource_time_off")
    .select("*, locations(name)")
    .eq("tenant_id", tenantId)
    .eq("resource_id", resourceId)
    .order("starts_at", { ascending: false });

  if (error) throw new Error("Unable to load resource time off");

  return mapRows(data ?? []);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapRows(data: (RtoRow & { locations: { name: string } | null })[]): ResourceTimeOffWithLocation[] {
  return data.map(mapRow);
}

function mapRow(row: RtoRow & { locations: { name: string } | null }): ResourceTimeOffWithLocation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    resourceId: row.resource_id,
    locationId: row.location_id,
    title: row.title,
    notes: row.notes,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isAllDay: row.is_all_day,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    locationName: row.locations?.name ?? null,
  };
}
