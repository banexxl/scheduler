import "server-only";

/**
 * Waitlist Join Service — Milestone 8.8.
 *
 * Handles creating waitlist entries with duplicate protection.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { JoinWaitlistInput } from "../types/waitlist";

type JoinResult =
  | { success: true; entryId: string; isExisting: boolean }
  | { success: false; error: string; code: string };

/**
 * Joins a customer to the waitlist for a specific service/location.
 * Checks for existing active duplicate (same tenant+service+location+email+overlapping dates).
 */
export async function joinWaitlist(
  tenantId: string,
  input: JoinWaitlistInput
): Promise<JoinResult> {
  const supabase = createAdminClient();

  // Validate date range
  if (input.preferredDateFrom > input.preferredDateTo) {
    return { success: false, error: "Start date must be before end date.", code: "INVALID_RANGE" };
  }

  const daysDiff = Math.ceil(
    (new Date(input.preferredDateTo).getTime() - new Date(input.preferredDateFrom).getTime()) / (24 * 60 * 60_000)
  );
  if (daysDiff > 30) {
    return { success: false, error: "Date range cannot exceed 30 days.", code: "RANGE_TOO_LARGE" };
  }

  // Duplicate check: same email + service + location + overlapping active window
  if (input.customerEmail) {
    const normalizedEmail = input.customerEmail.trim().toLowerCase();

    const { data: existing } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("waitlist_entries" as never)
      .select("id" as never)
      .eq("tenant_id" as never, tenantId)
      .eq("service_id" as never, input.serviceId)
      .eq("location_id" as never, input.locationId)
      .eq("customer_email" as never, normalizedEmail)
      .eq("status" as never, "active")
      .gte("preferred_date_to" as never, input.preferredDateFrom)
      .lte("preferred_date_from" as never, input.preferredDateTo)
      .limit(1);

    if (existing && (existing as unknown as unknown[]).length > 0) {
      const existingId = (existing as unknown as Array<{ id: string }>)[0]!.id;
      return { success: true, entryId: existingId, isExisting: true };
    }
  }

  // Insert entry
  const { data, error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("waitlist_entries" as never)
    .insert({
      tenant_id: tenantId,
      service_id: input.serviceId,
      location_id: input.locationId,
      resource_id: input.resourceId ?? null,
      customer_name: input.customerName.trim(),
      customer_email: input.customerEmail?.trim().toLowerCase() ?? null,
      customer_phone: input.customerPhone?.trim() ?? null,
      preferred_date_from: input.preferredDateFrom,
      preferred_date_to: input.preferredDateTo,
      preferred_time_from: input.preferredTimeFrom ?? null,
      preferred_time_to: input.preferredTimeTo ?? null,
      allow_any_resource: input.allowAnyResource ?? true,
      status: "active",
      notes: input.notes?.trim() || null,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Unable to join waitlist.", code: "INSERT_FAILED" };
  }

  return { success: true, entryId: (data as unknown as { id: string }).id, isExisting: false };
}

/**
 * Cancels a waitlist entry (customer removal).
 */
export async function cancelWaitlistEntry(
  tenantId: string,
  entryId: string
): Promise<{ success: boolean }> {
  const supabase = createAdminClient();

  const { error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("waitlist_entries" as never)
    .update({ status: "cancelled" } as never)
    .eq("id" as never, entryId)
    .eq("tenant_id" as never, tenantId)
    .eq("status" as never, "active");

  return { success: !error };
}
