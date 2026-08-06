import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ServiceLocationWithLocation,
  ServiceLocationWithService,
} from "../types/service-location";

// Note: The service_locations table is not yet in generated database types.
// These queries use type assertions until the migration is applied and types are regenerated.
// After running: npm run db:types — these assertions can be removed.

type ServiceLocationRow = {
  id: string;
  tenant_id: string;
  service_id: string;
  location_id: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// Temporary untyped client interface until service_locations is in generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedFrom = { from: (table: string) => any };

/**
 * Get all locations assigned to a service (with location details).
 * Results ordered by sort_order, then created_at.
 */
export async function getLocationsForService(
  tenantId: string,
  serviceId: string
): Promise<ServiceLocationWithLocation[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("service_locations")
    .select("*, locations(name, slug, location_type, is_active)")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error("Unable to load service location assignments");

  return ((data ?? []) as (ServiceLocationRow & { locations: { name: string; slug: string; location_type: string; is_active: boolean } })[]).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    serviceId: row.service_id,
    locationId: row.location_id,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    locationName: row.locations.name,
    locationSlug: row.locations.slug,
    locationType: row.locations.location_type,
    locationIsActive: row.locations.is_active,
  }));
}

/**
 * Get only active locations assigned to a service.
 * An assignment is considered active when:
 * - The assignment itself is active
 * - The location is active
 */
export async function getActiveLocationsForService(
  tenantId: string,
  serviceId: string
): Promise<ServiceLocationWithLocation[]> {
  const all = await getLocationsForService(tenantId, serviceId);
  return all.filter((sl) => sl.isActive && sl.locationIsActive);
}

/**
 * Get all services assigned to a location (with service details).
 * Results ordered by sort_order, then created_at.
 */
export async function getServicesForLocation(
  tenantId: string,
  locationId: string
): Promise<ServiceLocationWithService[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("service_locations")
    .select("*, services(name, slug, is_active, duration_minutes, price, currency)")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error("Unable to load location service assignments");

  return ((data ?? []) as (ServiceLocationRow & { services: { name: string; slug: string; is_active: boolean; duration_minutes: number; price: number; currency: string } })[]).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    serviceId: row.service_id,
    locationId: row.location_id,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    serviceName: row.services.name,
    serviceSlug: row.services.slug,
    serviceIsActive: row.services.is_active,
    serviceDurationMinutes: row.services.duration_minutes,
    servicePrice: Number(row.services.price),
    serviceCurrency: row.services.currency,
  }));
}

/**
 * Get location IDs assigned to a service (lightweight, for form preselection).
 */
export async function getLocationIdsForService(
  tenantId: string,
  serviceId: string
): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("service_locations")
    .select("location_id")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Unable to load service location IDs");

  return ((data ?? []) as { location_id: string }[]).map((row) => row.location_id);
}

/**
 * Check whether a service is offered at a specific location.
 * Only returns true if both the assignment exists and is active.
 */
export async function isServiceAtLocation(
  tenantId: string,
  serviceId: string,
  locationId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("service_locations")
    .select("id, is_active")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .eq("location_id", locationId)
    .single();

  if (error || !data) return false;
  return (data as { id: string; is_active: boolean }).is_active;
}

/**
 * Get services with their assigned location counts for the management list.
 * Avoids N+1 by fetching all service_locations for the tenant in one query.
 */
export async function getServiceLocationCounts(
  tenantId: string
): Promise<Map<string, { count: number; locationNames: string[] }>> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("service_locations")
    .select("service_id, locations(name)")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Unable to load service location counts");

  const map = new Map<string, { count: number; locationNames: string[] }>();

  for (const row of (data ?? []) as { service_id: string; locations: { name: string } }[]) {
    const existing = map.get(row.service_id);
    if (existing) {
      existing.count += 1;
      existing.locationNames.push(row.locations.name);
    } else {
      map.set(row.service_id, { count: 1, locationNames: [row.locations.name] });
    }
  }

  return map;
}
