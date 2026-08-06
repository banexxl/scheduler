import "server-only";

/**
 * Server-side query services for booking rules — Milestone 6.8.
 *
 * Provides:
 * - getTenantBookingRules: Fetch tenant booking rules row
 * - getServiceBookingRules: Fetch service override row
 * - getResolvedBookingRules: Resolve effective rules for a service
 * - getResolvedBookingRulesForTenant: Resolve tenant-level rules (no service override)
 *
 * All queries:
 * - Scope to tenant (no cross-tenant exposure)
 * - Use user-scoped Supabase client (RLS enforced)
 * - Return application defaults when no row exists
 * - Ignore inactive service overrides during resolution
 */

import { createClient } from "@/lib/supabase/server";
import type {
  TenantBookingRules,
  ServiceBookingRules,
  ResolvedBookingRules,
} from "../types/booking-rules";
import { resolveBookingRules } from "../utils/resolve-booking-rules";

// ─── Row Mappers ─────────────────────────────────────────────────────────────

function mapTenantRow(row: Record<string, unknown>): TenantBookingRules {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    minimumNoticeMinutes: row.minimum_notice_minutes as number,
    maximumAdvanceDays: row.maximum_advance_days as number,
    slotIntervalMinutes: row.slot_interval_minutes as number,
    cancellationNoticeMinutes: row.cancellation_notice_minutes as number,
    rescheduleNoticeMinutes: row.reschedule_notice_minutes as number,
    allowSameDayBooking: row.allow_same_day_booking as boolean,
    allowCustomerCancellation: row.allow_customer_cancellation as boolean,
    allowCustomerRescheduling: row.allow_customer_rescheduling as boolean,
    requireCustomerPhone: row.require_customer_phone as boolean,
    requireCustomerEmail: row.require_customer_email as boolean,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapServiceRow(row: Record<string, unknown>): ServiceBookingRules {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    serviceId: row.service_id as string,
    minimumNoticeMinutes: row.minimum_notice_minutes as number | null,
    maximumAdvanceDays: row.maximum_advance_days as number | null,
    slotIntervalMinutes: row.slot_interval_minutes as number | null,
    cancellationNoticeMinutes: row.cancellation_notice_minutes as number | null,
    rescheduleNoticeMinutes: row.reschedule_notice_minutes as number | null,
    allowSameDayBooking: row.allow_same_day_booking as boolean | null,
    allowCustomerCancellation: row.allow_customer_cancellation as boolean | null,
    allowCustomerRescheduling: row.allow_customer_rescheduling as boolean | null,
    requireCustomerPhone: row.require_customer_phone as boolean | null,
    requireCustomerEmail: row.require_customer_email as boolean | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── Tenant Booking Rules ────────────────────────────────────────────────────

/**
 * Fetches the tenant booking rules row for a given tenant.
 * Returns null when no row exists (application defaults should be used).
 */
export async function getTenantBookingRules(
  tenantId: string
): Promise<TenantBookingRules | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenant_booking_rules")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) return null;
  return mapTenantRow(data as Record<string, unknown>);
}

// ─── Service Booking Rules ───────────────────────────────────────────────────

/**
 * Fetches the service booking rules override for a given service.
 * Returns null when no override row exists.
 */
export async function getServiceBookingRules(
  tenantId: string,
  serviceId: string
): Promise<ServiceBookingRules | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_booking_rules")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("service_id", serviceId)
    .single();

  if (error || !data) return null;
  return mapServiceRow(data as Record<string, unknown>);
}

// ─── Resolved Booking Rules (for a service) ──────────────────────────────────

/**
 * Resolves the effective booking rules for a specific service.
 *
 * Loads both tenant rules and service override, then merges via
 * the resolution utility. Returns application defaults when no
 * configuration exists.
 */
export async function getResolvedBookingRules(
  tenantId: string,
  serviceId: string
): Promise<ResolvedBookingRules> {
  const [tenantRules, serviceRules] = await Promise.all([
    getTenantBookingRules(tenantId),
    getServiceBookingRules(tenantId, serviceId),
  ]);

  return resolveBookingRules({ tenantRules, serviceRules });
}

// ─── Resolved Booking Rules (tenant-level only) ──────────────────────────────

/**
 * Resolves the effective booking rules at tenant level (no service override).
 * Useful for tenant settings pages.
 */
export async function getResolvedBookingRulesForTenant(
  tenantId: string
): Promise<ResolvedBookingRules> {
  const tenantRules = await getTenantBookingRules(tenantId);
  return resolveBookingRules({ tenantRules, serviceRules: null });
}
