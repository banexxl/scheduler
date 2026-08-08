import "server-only";

/**
 * Waitlist Portal Queries — Milestone 8.8.
 *
 * Loads waitlist entries for a customer in the portal context.
 * Returns only the current customer's entries (by email).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicWaitlistEntry } from "../types/waitlist";

/**
 * Gets active/matched waitlist entries for a customer by email.
 * Tenant-scoped. Returns public-safe DTOs.
 */
export async function getCustomerWaitlistEntries(
  tenantId: string,
  normalizedEmail: string
): Promise<PublicWaitlistEntry[]> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("waitlist_entries" as never)
    .select("id, service_id, location_id, resource_id, preferred_date_from, preferred_date_to, preferred_time_from, preferred_time_to, allow_any_resource, status" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("customer_email" as never, normalizedEmail)
    .in("status" as never, ["active", "matched"] as never)
    .order("created_at" as never, { ascending: false })
    .limit(20);

  if (!data) return [];

  const rows = data as unknown as Array<Record<string, unknown>>;

  // Load service/location names
  const serviceIds = [...new Set(rows.map(r => r.service_id as string))];
  const locationIds = [...new Set(rows.map(r => r.location_id as string))];

  const [servicesResult, locationsResult] = await Promise.all([
    serviceIds.length > 0
      ? (supabase as never as ReturnType<typeof createAdminClient>).from("services" as never).select("id, name" as never).in("id" as never, serviceIds as never)
      : { data: [] },
    locationIds.length > 0
      ? (supabase as never as ReturnType<typeof createAdminClient>).from("locations" as never).select("id, name" as never).in("id" as never, locationIds as never)
      : { data: [] },
  ]);

  const serviceMap = new Map((((servicesResult as { data: unknown }).data ?? []) as Array<{ id: string; name: string }>).map(s => [s.id, s.name]));
  const locationMap = new Map((((locationsResult as { data: unknown }).data ?? []) as Array<{ id: string; name: string }>).map(l => [l.id, l.name]));

  return rows.map((row): PublicWaitlistEntry => ({
    serviceName: serviceMap.get(row.service_id as string) ?? "Service",
    locationName: locationMap.get(row.location_id as string) ?? "Location",
    resourcePreference: row.allow_any_resource ? "Any available" : "Specific",
    dateFrom: row.preferred_date_from as string,
    dateTo: row.preferred_date_to as string,
    timeFrom: (row.preferred_time_from as string) ?? null,
    timeTo: (row.preferred_time_to as string) ?? null,
    status: row.status as string,
  }));
}
