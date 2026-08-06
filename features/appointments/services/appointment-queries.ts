import "server-only";

/**
 * Server-side query services for appointments — Milestone 6.9.
 *
 * Provides:
 * - getAppointmentById: Fetch a single appointment
 * - getAppointmentsList: Fetch filtered/paginated list
 * - getAppointmentsByResource: Fetch for a specific resource
 * - getAppointmentsByCustomer: Fetch for a specific customer
 * - getAppointmentsByService: Fetch for a specific service
 * - getUpcomingAppointments: Fetch upcoming confirmed/pending
 * - loadBlockingAppointments: Load blocking intervals for availability
 * - getAppointmentCountsByStatus: Aggregate counts by status
 *
 * All queries:
 * - Scope to tenant (no cross-tenant exposure)
 * - Use user-scoped Supabase client (RLS enforced)
 * - Return camelCase mapped domain types
 * - Order by starts_at
 */

import { createClient } from "@/lib/supabase/server";
import type {
  Appointment,
  AppointmentListItem,
  AppointmentListFilters,
  AppointmentStatus,
  BlockingAppointmentInterval,
} from "../types/appointment";

// ─── Row Mapper ──────────────────────────────────────────────────────────────

function mapAppointmentRow(row: Record<string, unknown>): Appointment {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    appointmentNumber: row.appointment_number as string,
    serviceId: row.service_id as string,
    locationId: row.location_id as string,
    resourceId: row.resource_id as string,
    customerId: (row.customer_id as string) ?? null,
    customerName: row.customer_name as string,
    customerEmail: (row.customer_email as string) ?? null,
    customerPhone: (row.customer_phone as string) ?? null,
    status: row.status as AppointmentStatus,
    source: row.source as Appointment["source"],
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    occupiedStartsAt: row.occupied_starts_at as string,
    occupiedEndsAt: row.occupied_ends_at as string,
    durationMinutes: row.duration_minutes as number,
    bufferBeforeMinutes: row.buffer_before_minutes as number,
    bufferAfterMinutes: row.buffer_after_minutes as number,
    price: String(row.price),
    currency: row.currency as string,
    serviceNameSnapshot: row.service_name_snapshot as string,
    locationNameSnapshot: row.location_name_snapshot as string,
    resourceNameSnapshot: row.resource_name_snapshot as string,
    internalNotes: (row.internal_notes as string) ?? null,
    customerNotes: (row.customer_notes as string) ?? null,
    cancelledAt: (row.cancelled_at as string) ?? null,
    cancelledBy: (row.cancelled_by as string) ?? null,
    cancellationReason: (row.cancellation_reason as string) ?? null,
    createdBy: (row.created_by as string) ?? null,
    updatedBy: (row.updated_by as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    scheduleVersion: (row.schedule_version as number) ?? 1,
  };
}

function mapListItemRow(row: Record<string, unknown>): AppointmentListItem {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    appointmentNumber: row.appointment_number as string,
    customerName: row.customer_name as string,
    customerEmail: (row.customer_email as string) ?? null,
    customerPhone: (row.customer_phone as string) ?? null,
    status: row.status as AppointmentStatus,
    source: row.source as AppointmentListItem["source"],
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    durationMinutes: row.duration_minutes as number,
    price: String(row.price),
    currency: row.currency as string,
    serviceNameSnapshot: row.service_name_snapshot as string,
    locationNameSnapshot: row.location_name_snapshot as string,
    resourceNameSnapshot: row.resource_name_snapshot as string,
    serviceId: row.service_id as string,
    locationId: row.location_id as string,
    resourceId: row.resource_id as string,
    createdAt: row.created_at as string,
  };
}

// ─── Get Single Appointment ──────────────────────────────────────────────────

/**
 * Fetches a single appointment by ID within a tenant.
 * Returns null if not found or not accessible.
 */
export async function getAppointmentById(
  tenantId: string,
  appointmentId: string
): Promise<Appointment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) return null;
  return mapAppointmentRow(data as Record<string, unknown>);
}

// ─── List Appointments (filtered + paginated) ────────────────────────────────

/**
 * Fetches a filtered list of appointments for a tenant.
 * Ordered by starts_at descending (most recent first).
 * Paginated with limit/offset.
 */
export async function getAppointmentsList(
  tenantId: string,
  filters: AppointmentListFilters = {},
  limit = 50,
  offset = 0
): Promise<{ items: AppointmentListItem[]; total: number }> {
  const supabase = await createClient();

  const selectColumns = [
    "id", "tenant_id", "appointment_number",
    "customer_name", "customer_email", "customer_phone",
    "status", "source", "starts_at", "ends_at", "duration_minutes",
    "price", "currency",
    "service_name_snapshot", "location_name_snapshot", "resource_name_snapshot",
    "service_id", "location_id", "resource_id", "created_at",
  ].join(", ");

  let query = supabase
    .from("appointments")
    .select(selectColumns, { count: "exact" })
    .eq("tenant_id", tenantId);

  // Apply filters
  if (filters.dateFrom) {
    query = query.gte("starts_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("starts_at", filters.dateTo);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.locationId) {
    query = query.eq("location_id", filters.locationId);
  }
  if (filters.resourceId) {
    query = query.eq("resource_id", filters.resourceId);
  }
  if (filters.serviceId) {
    query = query.eq("service_id", filters.serviceId);
  }
  if (filters.customerSearch) {
    query = query.ilike("customer_name", `%${filters.customerSearch}%`);
  }

  const { data, error, count } = await query
    .order("starts_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { items: [], total: 0 };

  return {
    items: (data as unknown as Record<string, unknown>[]).map(mapListItemRow),
    total: count ?? 0,
  };
}

// ─── Get Appointments by Resource ────────────────────────────────────────────

export async function getAppointmentsByResource(
  tenantId: string,
  resourceId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<AppointmentListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("appointments")
    .select("id, tenant_id, appointment_number, customer_name, customer_email, customer_phone, status, source, starts_at, ends_at, duration_minutes, price, currency, service_name_snapshot, location_name_snapshot, resource_name_snapshot, service_id, location_id, resource_id, created_at")
    .eq("tenant_id", tenantId)
    .eq("resource_id", resourceId);

  if (dateFrom) query = query.gte("starts_at", dateFrom);
  if (dateTo) query = query.lte("starts_at", dateTo);

  const { data } = await query.order("starts_at", { ascending: true });

  return (data ?? []).map((row) => mapListItemRow(row as Record<string, unknown>));
}

// ─── Get Appointments by Customer ────────────────────────────────────────────

export async function getAppointmentsByCustomer(
  tenantId: string,
  customerId: string
): Promise<AppointmentListItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("appointments")
    .select("id, tenant_id, appointment_number, customer_name, customer_email, customer_phone, status, source, starts_at, ends_at, duration_minutes, price, currency, service_name_snapshot, location_name_snapshot, resource_name_snapshot, service_id, location_id, resource_id, created_at")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .order("starts_at", { ascending: false });

  return (data ?? []).map((row) => mapListItemRow(row as Record<string, unknown>));
}

// ─── Get Appointments by Service ─────────────────────────────────────────────

export async function getAppointmentsByService(
  tenantId: string,
  serviceId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<AppointmentListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("appointments")
    .select("id, tenant_id, appointment_number, customer_name, customer_email, customer_phone, status, source, starts_at, ends_at, duration_minutes, price, currency, service_name_snapshot, location_name_snapshot, resource_name_snapshot, service_id, location_id, resource_id, created_at")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId);

  if (dateFrom) query = query.gte("starts_at", dateFrom);
  if (dateTo) query = query.lte("starts_at", dateTo);

  const { data } = await query.order("starts_at", { ascending: true });

  return (data ?? []).map((row) => mapListItemRow(row as Record<string, unknown>));
}

// ─── Get Upcoming Appointments ───────────────────────────────────────────────

export async function getUpcomingAppointments(
  tenantId: string,
  limit = 20
): Promise<AppointmentListItem[]> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data } = await supabase
    .from("appointments")
    .select("id, tenant_id, appointment_number, customer_name, customer_email, customer_phone, status, source, starts_at, ends_at, duration_minutes, price, currency, service_name_snapshot, location_name_snapshot, resource_name_snapshot, service_id, location_id, resource_id, created_at")
    .eq("tenant_id", tenantId)
    .gte("starts_at", now)
    .in("status", ["pending", "confirmed"])
    .order("starts_at", { ascending: true })
    .limit(limit);

  return (data ?? []).map((row) => mapListItemRow(row as Record<string, unknown>));
}

// ─── Load Blocking Appointments (for availability calculation) ────────────────

/**
 * Loads blocking appointment intervals for specified resources
 * within a time range. Used by the availability engine to subtract
 * occupied intervals from available ranges.
 *
 * Loads all non-cancelled appointments whose occupied window overlaps
 * the given range. Bulk-loads for multiple resource IDs to avoid N+1.
 */
export async function loadBlockingAppointments(
  tenantId: string,
  resourceIds: string[],
  rangeStart: string,
  rangeEnd: string
): Promise<BlockingAppointmentInterval[]> {
  if (resourceIds.length === 0) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("appointments")
    .select("id, resource_id, occupied_starts_at, occupied_ends_at")
    .eq("tenant_id", tenantId)
    .in("resource_id", resourceIds)
    .neq("status", "cancelled")
    .lt("occupied_starts_at", rangeEnd)
    .gt("occupied_ends_at", rangeStart);

  return (data ?? []).map((row) => ({
    appointmentId: (row as Record<string, unknown>).id as string,
    resourceId: (row as Record<string, unknown>).resource_id as string,
    occupiedStartsAt: (row as Record<string, unknown>).occupied_starts_at as string,
    occupiedEndsAt: (row as Record<string, unknown>).occupied_ends_at as string,
  }));
}

// ─── Appointment Counts by Status ────────────────────────────────────────────

export type AppointmentStatusCounts = Record<AppointmentStatus, number>;

/**
 * Returns appointment counts grouped by status for a tenant.
 * Optionally filtered by date range.
 */
export async function getAppointmentCountsByStatus(
  tenantId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<AppointmentStatusCounts> {
  const supabase = await createClient();

  let query = supabase
    .from("appointments")
    .select("status")
    .eq("tenant_id", tenantId);

  if (dateFrom) query = query.gte("starts_at", dateFrom);
  if (dateTo) query = query.lte("starts_at", dateTo);

  const { data } = await query;

  const counts: AppointmentStatusCounts = {
    pending: 0,
    confirmed: 0,
    checked_in: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  };

  for (const row of data ?? []) {
    const status = (row as Record<string, unknown>).status as AppointmentStatus;
    if (status in counts) {
      counts[status]++;
    }
  }

  return counts;
}

// ─── Load Blocking Appointments Excluding One (for rescheduling) ─────────────

/**
 * Same as loadBlockingAppointments but excludes a specific appointment.
 * Used when rescheduling to avoid self-conflict.
 */
export async function loadBlockingAppointmentsExcluding(
  tenantId: string,
  resourceIds: string[],
  rangeStart: string,
  rangeEnd: string,
  excludeAppointmentId: string
): Promise<BlockingAppointmentInterval[]> {
  if (resourceIds.length === 0) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("appointments")
    .select("id, resource_id, occupied_starts_at, occupied_ends_at")
    .eq("tenant_id", tenantId)
    .in("resource_id", resourceIds)
    .neq("status", "cancelled")
    .neq("id", excludeAppointmentId)
    .lt("occupied_starts_at", rangeEnd)
    .gt("occupied_ends_at", rangeStart);

  return (data ?? []).map((row) => ({
    appointmentId: (row as Record<string, unknown>).id as string,
    resourceId: (row as Record<string, unknown>).resource_id as string,
    occupiedStartsAt: (row as Record<string, unknown>).occupied_starts_at as string,
    occupiedEndsAt: (row as Record<string, unknown>).occupied_ends_at as string,
  }));
}
