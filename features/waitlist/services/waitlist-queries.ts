import "server-only";

/**
 * Waitlist Query Service — Milestone 8.8.
 */

import { createClient } from "@/lib/supabase/server";
import type { WaitlistEntryListItem } from "../types/waitlist";

export type WaitlistFilters = {
  status?: string | null;
  serviceId?: string | null;
  locationId?: string | null;
};

export async function getWaitlistEntries(
  tenantId: string,
  filters: WaitlistFilters = {},
  limit = 50
): Promise<WaitlistEntryListItem[]> {
  const supabase = await createClient();

  let query = (supabase as never as Awaited<ReturnType<typeof createClient>>)
    .from("waitlist_entries" as never)
    .select("id, customer_name, customer_email, service_id, location_id, resource_id, preferred_date_from, preferred_date_to, preferred_time_from, preferred_time_to, allow_any_resource, status, created_at" as never)
    .eq("tenant_id" as never, tenantId);

  if (filters.status) query = query.eq("status" as never, filters.status);
  if (filters.serviceId) query = query.eq("service_id" as never, filters.serviceId);
  if (filters.locationId) query = query.eq("location_id" as never, filters.locationId);

  const { data } = await query
    .order("created_at" as never, { ascending: false })
    .limit(limit);

  if (!data) return [];

  // Load service/location/resource names in bulk
  const rows = data as unknown as Array<Record<string, unknown>>;
  const serviceIds = [...new Set(rows.map(r => r.service_id as string))];
  const locationIds = [...new Set(rows.map(r => r.location_id as string))];
  const resourceIds = [...new Set(rows.filter(r => r.resource_id).map(r => r.resource_id as string))];

  const [servicesResult, locationsResult, resourcesResult] = await Promise.all([
    serviceIds.length > 0
      ? (supabase as never as Awaited<ReturnType<typeof createClient>>).from("services" as never).select("id, name" as never).in("id" as never, serviceIds as never)
      : { data: [] },
    locationIds.length > 0
      ? (supabase as never as Awaited<ReturnType<typeof createClient>>).from("locations" as never).select("id, name" as never).in("id" as never, locationIds as never)
      : { data: [] },
    resourceIds.length > 0
      ? (supabase as never as Awaited<ReturnType<typeof createClient>>).from("resources" as never).select("id, name" as never).in("id" as never, resourceIds as never)
      : { data: [] },
  ]);

  const serviceMap = new Map((((servicesResult as { data: unknown }).data ?? []) as Array<{ id: string; name: string }>).map(s => [s.id, s.name]));
  const locationMap = new Map((((locationsResult as { data: unknown }).data ?? []) as Array<{ id: string; name: string }>).map(l => [l.id, l.name]));
  const resourceMap = new Map((((resourcesResult as { data: unknown }).data ?? []) as Array<{ id: string; name: string }>).map(r => [r.id, r.name]));

  return rows.map((row): WaitlistEntryListItem => ({
    id: row.id as string,
    customerName: row.customer_name as string,
    customerEmail: (row.customer_email as string) ?? null,
    serviceName: serviceMap.get(row.service_id as string) ?? "Unknown",
    locationName: locationMap.get(row.location_id as string) ?? "Unknown",
    resourceName: row.resource_id ? (resourceMap.get(row.resource_id as string) ?? null) : null,
    preferredDateFrom: row.preferred_date_from as string,
    preferredDateTo: row.preferred_date_to as string,
    preferredTimeFrom: (row.preferred_time_from as string) ?? null,
    preferredTimeTo: (row.preferred_time_to as string) ?? null,
    allowAnyResource: Boolean(row.allow_any_resource),
    status: row.status as WaitlistEntryListItem["status"],
    createdAt: row.created_at as string,
  }));
}
