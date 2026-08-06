import "server-only";

/**
 * Public service discovery — Milestone 6.11.
 *
 * Provides public-safe queries for services, categories, locations,
 * and resources eligible for public booking.
 *
 * Eligibility: service active + at least one active location assignment +
 * at least one active resource assignment with a valid resource-location combo.
 *
 * Does not require authentication. Uses tenant-scoped queries.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  PublicBookableService,
  PublicServiceCategory,
  PublicBookableLocation,
  PublicBookableResource,
} from "../types/public-booking";

// ─── Public Bookable Services ────────────────────────────────────────────────

/**
 * Loads publicly bookable services for a tenant.
 * A service is eligible when:
 * - Active
 * - Has at least one active service-location assignment
 * - Has at least one active service-resource assignment
 */
export async function getPublicBookableServices(
  tenantId: string
): Promise<PublicBookableService[]> {
  const supabase = await createClient();

  // Load active services
  const { data: services } = await supabase
    .from("services")
    .select("id, slug, name, description, service_category_id, duration_minutes, price, currency, is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!services || services.length === 0) return [];

  const serviceIds = services.map((s) => (s as Record<string, unknown>).id as string);

  // Bulk load active service-location assignments
  const { data: serviceLocations } = await supabase
    .from("service_locations")
    .select("service_id, location_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .in("service_id", serviceIds);

  // Bulk load active service-resource assignments
  const { data: serviceResources } = await supabase
    .from("service_resources")
    .select("service_id, resource_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .in("service_id", serviceIds);

  // Build eligibility maps
  const locationCounts = new Map<string, number>();
  for (const sl of serviceLocations ?? []) {
    const row = sl as Record<string, unknown>;
    const sid = row.service_id as string;
    locationCounts.set(sid, (locationCounts.get(sid) ?? 0) + 1);
  }

  const resourceCounts = new Map<string, Set<string>>();
  for (const sr of serviceResources ?? []) {
    const row = sr as Record<string, unknown>;
    const sid = row.service_id as string;
    const set = resourceCounts.get(sid) ?? new Set();
    set.add(row.resource_id as string);
    resourceCounts.set(sid, set);
  }

  // Load categories for names
  const categoryIds = [...new Set(
    services
      .map((s) => (s as Record<string, unknown>).service_category_id as string | null)
      .filter(Boolean)
  )];

  let categoryMap = new Map<string, string>();
  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("service_categories")
      .select("id, name")
      .in("id", categoryIds);

    for (const cat of categories ?? []) {
      const row = cat as Record<string, unknown>;
      categoryMap.set(row.id as string, row.name as string);
    }
  }

  // Filter to eligible services
  const eligible: PublicBookableService[] = [];

  for (const svc of services) {
    const row = svc as Record<string, unknown>;
    const id = row.id as string;
    const locCount = locationCounts.get(id) ?? 0;
    const resCount = resourceCounts.get(id)?.size ?? 0;

    // Must have at least one location and one resource assignment
    if (locCount === 0 || resCount === 0) continue;

    const categoryId = row.service_category_id as string | null;

    eligible.push({
      id,
      slug: row.slug as string,
      name: row.name as string,
      description: (row.description as string) ?? null,
      categoryId,
      categoryName: categoryId ? (categoryMap.get(categoryId) ?? null) : null,
      durationMinutes: row.duration_minutes as number,
      price: String(row.price),
      currency: row.currency as string,
      locationCount: locCount,
    });
  }

  return eligible;
}

// ─── Public Service Categories ───────────────────────────────────────────────

/**
 * Loads service categories that contain at least one publicly bookable service.
 */
export async function getPublicServiceCategories(
  tenantId: string,
  bookableServiceIds: string[]
): Promise<PublicServiceCategory[]> {
  if (bookableServiceIds.length === 0) return [];

  const supabase = await createClient();

  // Load services with categories
  const { data: services } = await supabase
    .from("services")
    .select("id, service_category_id")
    .eq("tenant_id", tenantId)
    .in("id", bookableServiceIds);

  // Count services per category
  const categoryCounts = new Map<string, number>();
  for (const svc of services ?? []) {
    const row = svc as Record<string, unknown>;
    const catId = row.service_category_id as string | null;
    if (catId) {
      categoryCounts.set(catId, (categoryCounts.get(catId) ?? 0) + 1);
    }
  }

  if (categoryCounts.size === 0) return [];

  const categoryIds = [...categoryCounts.keys()];
  const { data: categories } = await supabase
    .from("service_categories")
    .select("id, name, description")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .in("id", categoryIds)
    .order("sort_order", { ascending: true });

  return (categories ?? []).map((cat) => {
    const row = cat as Record<string, unknown>;
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) ?? null,
      serviceCount: categoryCounts.get(row.id as string) ?? 0,
    };
  });
}

// ─── Public Locations for a Service ──────────────────────────────────────────

/**
 * Loads active locations assigned to a service for public booking.
 */
export async function getPublicLocationsForService(
  tenantId: string,
  serviceId: string
): Promise<PublicBookableLocation[]> {
  const supabase = await createClient();

  // Get active service-location assignment IDs
  const { data: assignments } = await supabase
    .from("service_locations")
    .select("location_id")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .eq("is_active", true);

  if (!assignments || assignments.length === 0) return [];

  const locationIds = assignments.map((a) => (a as Record<string, unknown>).location_id as string);

  // Load active locations
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, city, street_address, description, is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .in("id", locationIds)
    .order("sort_order", { ascending: true });

  return (locations ?? []).map((loc) => {
    const row = loc as Record<string, unknown>;
    return {
      id: row.id as string,
      name: row.name as string,
      city: (row.city as string) ?? null,
      streetAddress: (row.street_address as string) ?? null,
      description: (row.description as string) ?? null,
    };
  });
}

// ─── Public Resources for a Service + Location ───────────────────────────────

/**
 * Loads eligible resources for a service at a specific location.
 * A resource is eligible when:
 * - Active
 * - Service-resource assignment is active
 * - Resource-location assignment is active
 */
export async function getPublicResourcesForServiceLocation(
  tenantId: string,
  serviceId: string,
  locationId: string
): Promise<PublicBookableResource[]> {
  const supabase = await createClient();

  // Get active service-resource assignments
  const { data: srAssignments } = await supabase
    .from("service_resources")
    .select("resource_id")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .eq("is_active", true);

  if (!srAssignments || srAssignments.length === 0) return [];

  const resourceIds = srAssignments.map((a) => (a as Record<string, unknown>).resource_id as string);

  // Filter by active resource-location assignments
  const { data: rlAssignments } = await supabase
    .from("resource_locations")
    .select("resource_id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("is_active", true)
    .in("resource_id", resourceIds);

  if (!rlAssignments || rlAssignments.length === 0) return [];

  const eligibleResourceIds = rlAssignments.map((a) => (a as Record<string, unknown>).resource_id as string);

  // Load active resources
  const { data: resources } = await supabase
    .from("resources")
    .select("id, name, is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .in("id", eligibleResourceIds)
    .order("sort_order", { ascending: true });

  return (resources ?? []).map((res) => {
    const row = res as Record<string, unknown>;
    return {
      id: row.id as string,
      name: row.name as string,
    };
  });
}

// ─── Public Service by Slug ──────────────────────────────────────────────────

/**
 * Loads a single service by slug for public booking detail.
 * Returns null if service doesn't exist, is inactive, or has no assignments.
 */
export async function getPublicServiceBySlug(
  tenantId: string,
  serviceSlug: string
): Promise<PublicBookableService | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("services")
    .select("id, slug, name, description, service_category_id, duration_minutes, price, currency")
    .eq("tenant_id", tenantId)
    .eq("slug", serviceSlug)
    .eq("is_active", true)
    .single();

  if (!data) return null;

  const row = data as Record<string, unknown>;
  const serviceId = row.id as string;

  // Verify has at least one location
  const { count: locCount } = await supabase
    .from("service_locations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .eq("is_active", true);

  if (!locCount || locCount === 0) return null;

  // Get category name
  let categoryName: string | null = null;
  const categoryId = row.service_category_id as string | null;
  if (categoryId) {
    const { data: cat } = await supabase
      .from("service_categories")
      .select("name")
      .eq("id", categoryId)
      .single();
    if (cat) categoryName = (cat as Record<string, unknown>).name as string;
  }

  return {
    id: serviceId,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    categoryId,
    categoryName,
    durationMinutes: row.duration_minutes as number,
    price: String(row.price),
    currency: row.currency as string,
    locationCount: locCount ?? 0,
  };
}
