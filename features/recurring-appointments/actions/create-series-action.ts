"use server";

/**
 * Create Appointment Series Action — Milestone 15.1.
 *
 * Atomically creates a recurring series and all its appointment occurrences.
 * Validates availability for every occurrence before creation.
 */

import { revalidatePath } from "next/cache";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateRecurringOccurrences } from "../services/generate-occurrences";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import type { RecurrenceRule } from "../types/recurrence";
import { MAX_SERIES_OCCURRENCES } from "../types/recurrence";

type CreateSeriesInput = {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerId?: string;
  serviceId: string;
  locationId: string;
  resourceId?: string;
  recurrence: RecurrenceRule;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  price: number;
  currency: string;
};

type CreateSeriesResult =
  | { success: true; seriesId: string; occurrenceCount: number }
  | { success: false; message: string; conflicts?: string[] };

export async function createAppointmentSeriesAction(
  tenantSlug: string,
  input: CreateSeriesInput
): Promise<CreateSeriesResult> {
  const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const log = createServerActionLogger({
    action: "appointment_series.create",
    tenantId: tenant.id,
    userId: user.id,
  });

  // Validate recurrence
  const rule = input.recurrence;
  if (!rule.type || !rule.startsOn || !rule.startsAtLocalTime || !rule.timezone) {
    return { success: false, message: "Invalid recurrence rule." };
  }

  if (!rule.endsOn && !rule.occurrenceCount) {
    return { success: false, message: "Series must have an end date or occurrence count." };
  }

  if ((rule.occurrenceCount ?? 0) > MAX_SERIES_OCCURRENCES) {
    return { success: false, message: `Maximum ${MAX_SERIES_OCCURRENCES} occurrences allowed.` };
  }

  // Generate occurrences
  const occurrences = generateRecurringOccurrences(rule, input.durationMinutes);
  if (occurrences.length === 0) {
    return { success: false, message: "No valid occurrences could be generated from this rule." };
  }

  // Load service/location/resource snapshots
  const supabase = createServiceRoleClient();

  const [svcResult, locResult, resResult] = await Promise.all([
    supabase.from("services").select("name").eq("id", input.serviceId).eq("tenant_id", tenant.id).single(),
    supabase.from("locations").select("name").eq("id", input.locationId).eq("tenant_id", tenant.id).single(),
    input.resourceId
      ? supabase.from("resources").select("name").eq("id", input.resourceId).eq("tenant_id", tenant.id).single()
      : Promise.resolve({ data: null }),
  ]);

  if (!svcResult.data || !locResult.data) {
    return { success: false, message: "Invalid service or location." };
  }

  // Check for conflicts (simplified — checks overlapping appointments)
  const conflicts: string[] = [];
  for (const occ of occurrences) {
    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("resource_id", input.resourceId ?? "")
      .lt("starts_at", occ.endsAtUtc)
      .gt("ends_at", occ.startsAtUtc)
      .not("status", "in", '("cancelled","no_show")')
      .limit(1);

    if (existing && existing.length > 0) {
      conflicts.push(occ.localDate);
    }
  }

  if (conflicts.length > 0) {
    return {
      success: false,
      message: `${conflicts.length} date(s) have scheduling conflicts.`,
      conflicts,
    };
  }

  // Create series atomically
  const { data: series, error: seriesError } = await supabase
    .from("appointment_series")
    .insert({
      tenant_id: tenant.id,
      customer_name: input.customerName,
      customer_email: input.customerEmail ?? null,
      customer_phone: input.customerPhone ?? null,
      customer_id: input.customerId ?? null,
      service_id: input.serviceId,
      location_id: input.locationId,
      resource_id: input.resourceId ?? null,
      timezone: rule.timezone,
      recurrence_type: rule.type,
      recurrence_interval: rule.interval,
      days_of_week: rule.daysOfWeek ?? null,
      day_of_month: rule.dayOfMonth ?? null,
      starts_on: rule.startsOn,
      ends_on: rule.endsOn ?? null,
      occurrence_count: occurrences.length,
      starts_at_local_time: rule.startsAtLocalTime,
      duration_minutes: input.durationMinutes,
      buffer_before_minutes: input.bufferBeforeMinutes ?? 0,
      buffer_after_minutes: input.bufferAfterMinutes ?? 0,
      service_name_snapshot: svcResult.data.name,
      location_name_snapshot: locResult.data.name,
      resource_name_snapshot: resResult.data?.name ?? null,
      price: input.price,
      currency: input.currency,
      status: "active",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (seriesError || !series) {
    await log.failure(seriesError ?? new Error("Series insert failed"));
    return { success: false, message: "Unable to create recurring series." };
  }

  // Create all appointment occurrences
  const appointmentRows = occurrences.map((occ) => ({
    tenant_id: tenant.id,
    service_id: input.serviceId,
    resource_id: input.resourceId ?? null,
    location_id: input.locationId,
    starts_at: occ.startsAtUtc,
    ends_at: occ.endsAtUtc,
    occupied_starts_at: occ.startsAtUtc,
    occupied_ends_at: occ.endsAtUtc,
    customer_name: input.customerName,
    customer_email: input.customerEmail ?? null,
    customer_phone: input.customerPhone ?? null,
    customer_id: input.customerId ?? null,
    status: "confirmed",
    service_name_snapshot: svcResult.data.name,
    resource_name_snapshot: resResult.data?.name ?? "—",
    location_name_snapshot: locResult.data.name,
    duration_minutes: input.durationMinutes,
    buffer_before_minutes: input.bufferBeforeMinutes ?? 0,
    buffer_after_minutes: input.bufferAfterMinutes ?? 0,
    price: input.price,
    currency: input.currency,
    appointment_number: `SER-${series.id.slice(0, 8).toUpperCase()}-${String(occ.index).padStart(2, "0")}`,
    series_id: series.id,
    series_occurrence_index: occ.index,
    source: "recurring",
    created_by: user.id,
  }));

  const { error: apptError } = await supabase
    .from("appointments")
    .insert(appointmentRows as never);

  if (apptError) {
    // Rollback series
    await supabase.from("appointment_series").delete().eq("id", series.id);
    await log.failure(apptError);
    return { success: false, message: "Unable to create appointment occurrences. Series rolled back." };
  }

  await log.success({ seriesId: series.id, occurrences: occurrences.length });
  revalidatePath(`/${tenantSlug}/appointments`);
  revalidatePath(`/${tenantSlug}/calendar`);

  return { success: true, seriesId: series.id, occurrenceCount: occurrences.length };
}
