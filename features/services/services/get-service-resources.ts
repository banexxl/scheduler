import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ServiceResourceWithResource,
  ServiceResourceWithService,
} from "../types/service-resource";
import type { ResourceKind } from "@/features/resources/types/resource";

// Note: The service_resources table is not yet in generated database types.
// These queries use type assertions until the migration is applied and types are regenerated.

type ServiceResourceRow = {
  id: string;
  tenant_id: string;
  service_id: string;
  resource_id: string;
  is_active: boolean;
  duration_override_minutes: number | null;
  price_override: number | null;
  currency_override: string | null;
  buffer_before_override_minutes: number | null;
  buffer_after_override_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// Temporary untyped client interface until service_resources is in generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedFrom = { from: (table: string) => any };

/**
 * Get all resources assigned to a service (with resource details).
 */
export async function getResourcesForService(
  tenantId: string,
  serviceId: string
): Promise<ServiceResourceWithResource[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("service_resources")
    .select("*, resources(name, slug, is_active, resource_type_id, resource_types(name, resource_kind))")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error("Unable to load service resource assignments");

  return ((data ?? []) as (ServiceResourceRow & {
    resources: {
      name: string; slug: string; is_active: boolean; resource_type_id: string;
      resource_types: { name: string; resource_kind: string } | null;
    };
  })[]).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    serviceId: row.service_id,
    resourceId: row.resource_id,
    isActive: row.is_active,
    durationOverrideMinutes: row.duration_override_minutes,
    priceOverride: row.price_override != null ? Number(row.price_override) : null,
    currencyOverride: row.currency_override,
    bufferBeforeOverrideMinutes: row.buffer_before_override_minutes,
    bufferAfterOverrideMinutes: row.buffer_after_override_minutes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resourceName: row.resources.name,
    resourceSlug: row.resources.slug,
    resourceKind: (row.resources.resource_types?.resource_kind ?? "other") as ResourceKind,
    resourceTypeName: row.resources.resource_types?.name ?? "Unknown",
    resourceIsActive: row.resources.is_active,
  }));
}

/**
 * Get only active resources assigned to a service.
 */
export async function getActiveResourcesForService(
  tenantId: string,
  serviceId: string
): Promise<ServiceResourceWithResource[]> {
  const all = await getResourcesForService(tenantId, serviceId);
  return all.filter((sr) => sr.isActive && sr.resourceIsActive);
}

/**
 * Get all services assigned to a resource (with service details).
 */
export async function getServicesForResource(
  tenantId: string,
  resourceId: string
): Promise<ServiceResourceWithService[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("service_resources")
    .select("*, services(name, slug, is_active, duration_minutes, price, currency, buffer_before_minutes, buffer_after_minutes)")
    .eq("tenant_id", tenantId)
    .eq("resource_id", resourceId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error("Unable to load resource service assignments");

  return ((data ?? []) as (ServiceResourceRow & {
    services: {
      name: string; slug: string; is_active: boolean;
      duration_minutes: number; price: number; currency: string;
      buffer_before_minutes: number; buffer_after_minutes: number;
    };
  })[]).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    serviceId: row.service_id,
    resourceId: row.resource_id,
    isActive: row.is_active,
    durationOverrideMinutes: row.duration_override_minutes,
    priceOverride: row.price_override != null ? Number(row.price_override) : null,
    currencyOverride: row.currency_override,
    bufferBeforeOverrideMinutes: row.buffer_before_override_minutes,
    bufferAfterOverrideMinutes: row.buffer_after_override_minutes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    serviceName: row.services.name,
    serviceSlug: row.services.slug,
    serviceIsActive: row.services.is_active,
    serviceDurationMinutes: row.services.duration_minutes,
    servicePrice: Number(row.services.price),
    serviceCurrency: row.services.currency,
    serviceBufferBeforeMinutes: row.services.buffer_before_minutes,
    serviceBufferAfterMinutes: row.services.buffer_after_minutes,
  }));
}

/**
 * Get assignment details for one service and resource.
 */
export async function getServiceResourceAssignment(
  tenantId: string,
  serviceId: string,
  resourceId: string
): Promise<ServiceResourceWithResource | null> {
  const all = await getResourcesForService(tenantId, serviceId);
  return all.find((sr) => sr.resourceId === resourceId) ?? null;
}

/**
 * Get resource IDs assigned to a service (lightweight, for form preselection).
 */
export async function getResourceIdsForService(
  tenantId: string,
  serviceId: string
): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("service_resources")
    .select("resource_id")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Unable to load service resource IDs");

  return ((data ?? []) as { resource_id: string }[]).map((row) => row.resource_id);
}

/**
 * Get resource counts for multiple services (for management list display).
 * Avoids N+1 by fetching all service_resources for the tenant in one query.
 */
export async function getServiceResourceCounts(
  tenantId: string
): Promise<Map<string, { count: number; resourceNames: string[] }>> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("service_resources")
    .select("service_id, resources(name)")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Unable to load service resource counts");

  const map = new Map<string, { count: number; resourceNames: string[] }>();

  for (const row of (data ?? []) as { service_id: string; resources: { name: string } }[]) {
    const existing = map.get(row.service_id);
    if (existing) {
      existing.count += 1;
      existing.resourceNames.push(row.resources.name);
    } else {
      map.set(row.service_id, { count: 1, resourceNames: [row.resources.name] });
    }
  }

  return map;
}
