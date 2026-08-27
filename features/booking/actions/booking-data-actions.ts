"use server";

/**
 * Booking Data Actions — Milestone 17.0.
 *
 * Server actions for loading booking flow data:
 * - Available services (grouped by category)
 * - Eligible staff (filtered by selected services)
 * - Available locations
 * - Booking state validation
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { SelectedService, EligibleStaffMember, BookingLocation } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ServiceCategory = {
  id: string;
  name: string;
  services: SelectedService[];
};

export type AvailableServicesResult = {
  categories: ServiceCategory[];
  uncategorized: SelectedService[];
};

// ─── Get Available Services ──────────────────────────────────────────────────

/**
 * Loads active services grouped by category for a tenant.
 * Only returns services with at least one active location and resource assignment.
 */
export async function getAvailableServices(
  tenantId: string
): Promise<AvailableServicesResult> {
  const supabase = createServiceRoleClient();

  // Load active services
  const { data: services } = await supabase
    .from("services")
    .select("id, slug, name, description, service_category_id, duration_minutes, price, currency")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(100);

  if (!services || services.length === 0) {
    return { categories: [], uncategorized: [] };
  }

  const serviceIds = services.map((s) => (s as Record<string, unknown>).id as string);

  // Bulk load active assignments
  const [locAssignments, resAssignments] = await Promise.all([
    supabase.from("service_locations").select("service_id").eq("tenant_id", tenantId).eq("is_active", true).in("service_id", serviceIds),
    supabase.from("service_resources").select("service_id").eq("tenant_id", tenantId).eq("is_active", true).in("service_id", serviceIds),
  ]);

  const hasLocation = new Set(((locAssignments.data ?? []) as unknown as Array<{ service_id: string }>).map((r) => r.service_id));
  const hasResource = new Set(((resAssignments.data ?? []) as unknown as Array<{ service_id: string }>).map((r) => r.service_id));

  // Filter eligible services
  const eligible: SelectedService[] = [];
  for (const svc of services) {
    const row = svc as Record<string, unknown>;
    const id = row.id as string;
    if (!hasLocation.has(id) || !hasResource.has(id)) continue;
    eligible.push({
      id,
      name: row.name as string,
      slug: row.slug as string,
      durationMinutes: row.duration_minutes as number,
      price: String(row.price),
      currency: row.currency as string,
      categoryId: (row.service_category_id as string) ?? null,
      categoryName: null, // Resolved below
    });
  }

  // Load categories
  const categoryIds = [...new Set(eligible.map((s) => s.categoryId).filter((id): id is string => Boolean(id)))];
  const categoryMap = new Map<string, string>();

  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from("service_categories")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .in("id", categoryIds)
      .order("sort_order", { ascending: true });

    for (const cat of (cats ?? []) as unknown as Array<{ id: string; name: string }>) {
      categoryMap.set(cat.id, cat.name);
    }
  }

  // Assign category names and group
  const grouped = new Map<string, SelectedService[]>();
  const uncategorized: SelectedService[] = [];

  for (const svc of eligible) {
    if (svc.categoryId && categoryMap.has(svc.categoryId)) {
      svc.categoryName = categoryMap.get(svc.categoryId) ?? null;
      const list = grouped.get(svc.categoryId) ?? [];
      list.push(svc);
      grouped.set(svc.categoryId, list);
    } else {
      uncategorized.push(svc);
    }
  }

  // Build categories in order
  const categories: ServiceCategory[] = [];
  for (const [catId, catName] of categoryMap) {
    const svcs = grouped.get(catId);
    if (svcs && svcs.length > 0) {
      categories.push({ id: catId, name: catName, services: svcs });
    }
  }

  return { categories, uncategorized };
}

// ─── Get Eligible Staff ──────────────────────────────────────────────────────

/**
 * Loads staff members who can perform ALL of the selected services.
 * Joins staff_profiles → service_resources on resource_id.
 */
export async function getEligibleStaff(
  tenantId: string,
  serviceIds: string[]
): Promise<EligibleStaffMember[]> {
  if (serviceIds.length === 0) return [];

  const supabase = createServiceRoleClient();

  // Load active service-resource assignments for the selected services
  const { data: srRows } = await supabase
    .from("service_resources")
    .select("service_id, resource_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .in("service_id", serviceIds);

  if (!srRows || srRows.length === 0) return [];

  // Find resources that can handle ALL selected services
  const resourceServiceMap = new Map<string, Set<string>>();
  for (const row of srRows as unknown as Array<{ service_id: string; resource_id: string }>) {
    const set = resourceServiceMap.get(row.resource_id) ?? new Set();
    set.add(row.service_id);
    resourceServiceMap.set(row.resource_id, set);
  }

  const eligibleResourceIds: string[] = [];
  for (const [resourceId, svcSet] of resourceServiceMap) {
    if (serviceIds.every((id) => svcSet.has(id))) {
      eligibleResourceIds.push(resourceId);
    }
  }

  if (eligibleResourceIds.length === 0) return [];

  // Load staff profiles for eligible resources
  const { data: staffRows } = await supabase
    .from("staff_profiles")
    .select("id, display_name, job_title, avatar_url, resource_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .eq("is_public", true)
    .in("resource_id", eligibleResourceIds)
    .order("display_name", { ascending: true });

  return ((staffRows ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    displayName: row.display_name as string,
    jobTitle: (row.job_title as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    resourceId: row.resource_id as string,
  }));
}

// ─── Get Available Locations ─────────────────────────────────────────────────

/**
 * Loads active locations for a tenant. Used for the location selection step.
 */
export async function getAvailableLocations(
  tenantId: string
): Promise<BookingLocation[]> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("locations")
    .select("id, name, city, street_address, phone_number")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(50);

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    city: (row.city as string) ?? null,
    streetAddress: (row.street_address as string) ?? null,
    phoneNumber: (row.phone_number as string) ?? null,
  }));
}

// ─── Validate Booking State ──────────────────────────────────────────────────

/**
 * Validates that the current booking selections are still valid.
 * Returns an object describing what's invalid (if anything).
 */
export async function validateBookingState(
  tenantId: string,
  serviceIds: string[],
  staffId: string | null,
  locationId: string | null
): Promise<{ valid: boolean; invalidServices: string[]; invalidStaff: boolean; invalidLocation: boolean }> {
  const supabase = createServiceRoleClient();

  let invalidServices: string[] = [];
  let invalidStaff = false;
  let invalidLocation = false;

  // Validate services still exist and are active
  if (serviceIds.length > 0) {
    const { data: validServices } = await supabase
      .from("services")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .in("id", serviceIds);

    const validIds = new Set(((validServices ?? []) as unknown as Array<{ id: string }>).map((r) => r.id));
    invalidServices = serviceIds.filter((id) => !validIds.has(id));
  }

  // Validate staff still exists and is active
  if (staffId) {
    const { data: staff } = await supabase
      .from("staff_profiles")
      .select("id")
      .eq("id", staffId)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .eq("is_public", true)
      .maybeSingle();

    invalidStaff = !staff;
  }

  // Validate location still exists and is active
  if (locationId) {
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("id", locationId)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle();

    invalidLocation = !loc;
  }

  const valid = invalidServices.length === 0 && !invalidStaff && !invalidLocation;
  return { valid, invalidServices, invalidStaff, invalidLocation };
}
