import "server-only";

import { createClient } from "@/lib/supabase/server";

// Temporary untyped RPC interface for the new public-read functions until
// `npm run db:types` regenerates database.types.ts to include them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RpcClient = { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };

// ─── Types ───────────────────────────────────────────────────────────────────

export type TenantTimezone = {
  id: string;
  defaultTimezone: string;
};

export type ServiceForAvailability = {
  id: string;
  tenantId: string;
  name: string;
  durationMinutes: number;
  price: number;
  currency: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  isActive: boolean;
};

export type LocationForAvailability = {
  id: string;
  tenantId: string;
  name: string;
  timezone: string;
  isActive: boolean;
};

export type ServiceLocationForAvailability = {
  id: string;
  serviceId: string;
  locationId: string;
  isActive: boolean;
};

export type ServiceResourceForAvailability = {
  id: string;
  serviceId: string;
  resourceId: string;
  isActive: boolean;
  durationOverrideMinutes: number | null;
  priceOverride: number | null;
  currencyOverride: string | null;
  bufferBeforeOverrideMinutes: number | null;
  bufferAfterOverrideMinutes: number | null;
};

export type ResourceForAvailability = {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
};

export type ResourceLocationForAvailability = {
  id: string;
  resourceId: string;
  locationId: string;
  isActive: boolean;
};

export type LocationBusinessHourRow = {
  id: string;
  locationId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export type LocationExceptionRow = {
  id: string;
  locationId: string;
  exceptionDate: string;
  exceptionType: string;
  isActive: boolean;
};

export type LocationExceptionPeriodRow = {
  id: string;
  exceptionId: string;
  startTime: string;
  endTime: string;
};

export type ResourceWorkingHourRow = {
  id: string;
  resourceId: string;
  locationId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export type ResourceTimeOffRow = {
  id: string;
  resourceId: string;
  locationId: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

// ─── Query Functions ─────────────────────────────────────────────────────────

/**
 * Load tenant timezone by tenant ID.
 */
export async function loadTenantTimezone(
  tenantId: string
): Promise<TenantTimezone | null> {
  const supabase = await createClient();

  // Anonymous/customer callers aren't tenant members, so RLS blocks a direct
  // `tenants` read. This RPC exposes only id + timezone (never created_by or
  // other tenant fields) to unblock the public availability engine.
  const { data } = await (supabase as unknown as RpcClient).rpc(
    "get_public_tenant_timezone",
    { p_tenant_id: tenantId }
  );
  const row = (data as { id: string; default_timezone: string }[] | null)?.[0];

  if (!row) return null;

  return {
    id: row.id,
    defaultTimezone: row.default_timezone,
  };
}

/**
 * Load service by ID within a tenant.
 */
export async function loadServiceForAvailability(
  tenantId: string,
  serviceId: string
): Promise<ServiceForAvailability | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("services")
    .select("id, tenant_id, name, duration_minutes, price, currency, buffer_before_minutes, buffer_after_minutes, is_active")
    .eq("id", serviceId)
    .eq("tenant_id", tenantId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    tenantId: data.tenant_id,
    name: data.name,
    durationMinutes: data.duration_minutes,
    price: data.price,
    currency: data.currency,
    bufferBeforeMinutes: data.buffer_before_minutes,
    bufferAfterMinutes: data.buffer_after_minutes,
    isActive: data.is_active,
  };
}

/**
 * Load location by ID within a tenant.
 */
export async function loadLocationForAvailability(
  tenantId: string,
  locationId: string
): Promise<LocationForAvailability | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("locations")
    .select("id, tenant_id, name, timezone, is_active")
    .eq("id", locationId)
    .eq("tenant_id", tenantId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    tenantId: data.tenant_id,
    name: data.name,
    timezone: data.timezone,
    isActive: data.is_active,
  };
}

/**
 * Load service-location assignment.
 */
export async function loadServiceLocationAssignment(
  tenantId: string,
  serviceId: string,
  locationId: string
): Promise<ServiceLocationForAvailability | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("service_locations")
    .select("id, service_id, location_id, is_active")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .eq("location_id", locationId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    serviceId: data.service_id,
    locationId: data.location_id,
    isActive: data.is_active,
  };
}

/**
 * Load all active service-resource assignments for a service.
 * Optionally filter to a single resource.
 */
export async function loadServiceResourceAssignments(
  tenantId: string,
  serviceId: string,
  resourceId?: string | null
): Promise<ServiceResourceForAvailability[]> {
  const supabase = await createClient();

  let query = supabase
    .from("service_resources")
    .select("id, service_id, resource_id, is_active, duration_override_minutes, price_override, currency_override, buffer_before_override_minutes, buffer_after_override_minutes")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .eq("is_active", true);

  if (resourceId) {
    query = query.eq("resource_id", resourceId);
  }

  const { data } = await query;

  return (data ?? []).map((row) => ({
    id: row.id,
    serviceId: row.service_id,
    resourceId: row.resource_id,
    isActive: row.is_active,
    durationOverrideMinutes: row.duration_override_minutes,
    priceOverride: row.price_override,
    currencyOverride: row.currency_override,
    bufferBeforeOverrideMinutes: row.buffer_before_override_minutes,
    bufferAfterOverrideMinutes: row.buffer_after_override_minutes,
  }));
}

/**
 * Load resources by IDs within a tenant (bulk).
 */
export async function loadResourcesForAvailability(
  tenantId: string,
  resourceIds: string[]
): Promise<ResourceForAvailability[]> {
  if (resourceIds.length === 0) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("resources")
    .select("id, tenant_id, name, is_active")
    .eq("tenant_id", tenantId)
    .in("id", resourceIds);

  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    isActive: row.is_active,
  }));
}

/**
 * Load resource-location assignments for a set of resources at a location (bulk).
 */
export async function loadResourceLocationAssignments(
  tenantId: string,
  locationId: string,
  resourceIds: string[]
): Promise<ResourceLocationForAvailability[]> {
  if (resourceIds.length === 0) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("resource_locations")
    .select("id, resource_id, location_id, is_active")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .in("resource_id", resourceIds);

  return (data ?? []).map((row) => ({
    id: row.id,
    resourceId: row.resource_id,
    locationId: row.location_id,
    isActive: row.is_active,
  }));
}

/**
 * Load location business hours for a location.
 */
export async function loadLocationBusinessHours(
  tenantId: string,
  locationId: string
): Promise<LocationBusinessHourRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("location_business_hours")
    .select("id, location_id, day_of_week, start_time, end_time, is_active")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("is_active", true);

  return (data ?? []).map((row) => ({
    id: row.id,
    locationId: row.location_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    isActive: row.is_active,
  }));
}

/**
 * Load active location exception for a specific date.
 */
export async function loadLocationException(
  tenantId: string,
  locationId: string,
  localDate: string
): Promise<{ exception: LocationExceptionRow; periods: LocationExceptionPeriodRow[] } | null> {
  const supabase = await createClient();

  // Anonymous/customer callers aren't tenant members, so RLS blocks a direct
  // read here -- title/notes on this table can hold internal notes, so this
  // RPC deliberately projects only type/active flag, never free text.
  const { data: exceptionRows } = await (supabase as unknown as RpcClient).rpc(
    "get_public_location_exception",
    { p_tenant_id: tenantId, p_location_id: locationId, p_exception_date: localDate }
  );
  const exception = (exceptionRows as { id: string; exception_type: string; is_active: boolean }[] | null)?.[0];

  if (!exception) return null;

  // Load periods if custom_hours
  let periods: LocationExceptionPeriodRow[] = [];
  if (exception.exception_type === "custom_hours") {
    const { data: periodData } = await supabase
      .from("location_exception_periods")
      .select("id, exception_id, start_time, end_time")
      .eq("tenant_id", tenantId)
      .eq("exception_id", exception.id)
      .order("sort_order", { ascending: true });

    periods = (periodData ?? []).map((p) => ({
      id: p.id,
      exceptionId: p.exception_id,
      startTime: p.start_time,
      endTime: p.end_time,
    }));
  }

  return {
    exception: {
      id: exception.id,
      locationId,
      exceptionDate: localDate,
      exceptionType: exception.exception_type,
      isActive: exception.is_active,
    },
    periods,
  };
}

/**
 * Load resource working hours for a set of resources (bulk).
 * Returns only active periods.
 */
export async function loadResourceWorkingHours(
  tenantId: string,
  resourceIds: string[]
): Promise<ResourceWorkingHourRow[]> {
  if (resourceIds.length === 0) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("resource_working_hours")
    .select("id, resource_id, location_id, day_of_week, start_time, end_time, is_active")
    .eq("tenant_id", tenantId)
    .in("resource_id", resourceIds)
    .eq("is_active", true);

  return (data ?? []).map((row) => ({
    id: row.id,
    resourceId: row.resource_id,
    locationId: row.location_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    isActive: row.is_active,
  }));
}

/**
 * Load active resource time-off entries that overlap the given date range (instants).
 * Uses range-overlap predicate: starts_at < dayEnd AND ends_at > dayStart.
 */
export async function loadResourceTimeOff(
  tenantId: string,
  resourceIds: string[],
  dayStartInstant: string,
  dayEndInstant: string
): Promise<ResourceTimeOffRow[]> {
  if (resourceIds.length === 0) return [];

  const supabase = await createClient();

  // Anonymous/customer callers aren't tenant members, so RLS blocks a direct
  // read here -- title/notes on this table can hold internal HR-style notes,
  // so this RPC deliberately projects only the busy interval, never free text.
  const { data } = await (supabase as unknown as RpcClient).rpc(
    "get_public_resource_time_off",
    {
      p_tenant_id: tenantId,
      p_resource_ids: resourceIds,
      p_range_start: dayStartInstant,
      p_range_end: dayEndInstant,
    }
  );

  return ((data ?? []) as { resource_id: string; location_id: string | null; starts_at: string; ends_at: string }[]).map((row) => ({
    id: `${row.resource_id}:${row.starts_at}`,
    resourceId: row.resource_id,
    locationId: row.location_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: true,
  }));
}
