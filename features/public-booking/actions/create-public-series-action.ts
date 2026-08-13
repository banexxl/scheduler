"use server";

/**
 * Create Public Booking Series Action — Milestone 15.12.
 *
 * Public-facing recurring appointment series creation.
 * Reuses canonical infrastructure:
 * - generateRecurringOccurrences (pure occurrence generation)
 * - Conflict detection per-occurrence
 * - Atomic series + appointment bulk insert
 * - Appointment exclusion constraints for concurrency
 *
 * Key differences from staff createAppointmentSeriesAction:
 * - No authentication required (guest booking)
 * - Idempotency key support (prevents duplicate series)
 * - Uses resolvePublicBookingContext for tenant validation
 * - Validates availability for each occurrence
 * - Does NOT support online payment/package/gift-card for series
 *
 * Security:
 * - All IDs are revalidated server-side
 * - Idempotency prevents duplicate series
 * - All-or-nothing creation (atomic)
 * - Conflict detection before creation
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolvePublicBookingContext } from "../services/public-tenant-resolver";
import { generateRecurringOccurrences } from "@/features/recurring-appointments/services/generate-occurrences";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import type { RecurrenceRule } from "@/features/recurring-appointments/types/recurrence";
import { MAX_SERIES_OCCURRENCES } from "@/features/recurring-appointments/types/recurrence";
import type { PublicBookingConfirmation, PublicBookingErrorCode } from "../types/public-booking";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { formatRecurrenceSummary } from "@/features/recurring-appointments/services/generate-occurrences";

// ─── Types ───────────────────────────────────────────────────────────────────

type PublicSeriesInput = {
  serviceId: string;
  locationId: string;
  resourceId: string;
  recurrence: RecurrenceRule;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerNotes?: string | null;
  idempotencyKey: string;
};

type SeriesSuccess = { success: true; data: PublicBookingConfirmation };
type SeriesError = { success: false; error: string; code: PublicBookingErrorCode; conflicts?: string[] };
type CreatePublicSeriesResult = SeriesSuccess | SeriesError;

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function createPublicSeriesAction(
  tenantSlug: string,
  input: PublicSeriesInput
): Promise<CreatePublicSeriesResult> {
  const context = await resolvePublicBookingContext(tenantSlug);
  if (!context) {
    return { success: false, error: "Booking is not available.", code: "BOOKING_DISABLED" };
  }

  const { tenant, settings } = context;
  const tenantId = tenant.id;

  const log = createServerActionLogger({
    action: "public_booking.recurring_create",
    tenantId,
  });

  try {
    const rule = input.recurrence;

    // Validate recurrence rule
    if (!rule.type || !rule.startsOn || !rule.startsAtLocalTime || !rule.timezone) {
      return { success: false, error: "Invalid recurrence configuration.", code: "VALIDATION_ERROR" };
    }
    if (!rule.occurrenceCount && !rule.endsOn) {
      return { success: false, error: "Series must have an end.", code: "VALIDATION_ERROR" };
    }
    if ((rule.occurrenceCount ?? 0) > MAX_SERIES_OCCURRENCES) {
      return { success: false, error: `Maximum ${MAX_SERIES_OCCURRENCES} appointments allowed.`, code: "VALIDATION_ERROR" };
    }

    // Load service/location/resource for validation and snapshots
    const supabase = createServiceRoleClient();

    const [svcResult, locResult, resResult] = await Promise.all([
      supabase.from("services").select("id, name, duration_minutes, price, currency, buffer_before_minutes, buffer_after_minutes").eq("id", input.serviceId).eq("tenant_id", tenantId).single(),
      supabase.from("locations").select("id, name").eq("id", input.locationId).eq("tenant_id", tenantId).single(),
      supabase.from("resources").select("id, name").eq("id", input.resourceId).eq("tenant_id", tenantId).single(),
    ]);

    if (!svcResult.data) {
      return { success: false, error: "Service is no longer available.", code: "INVALID_SELECTION" };
    }
    if (!locResult.data) {
      return { success: false, error: "Location is no longer available.", code: "INVALID_SELECTION" };
    }
    if (!resResult.data) {
      return { success: false, error: "Resource is no longer available.", code: "INVALID_SELECTION" };
    }

    const service = svcResult.data as { id: string; name: string; duration_minutes: number; price: number; currency: string; buffer_before_minutes: number; buffer_after_minutes: number };
    const location = locResult.data as { id: string; name: string };
    const resource = resResult.data as { id: string; name: string };

    // Generate occurrences
    const occurrences = generateRecurringOccurrences(rule, service.duration_minutes);
    if (occurrences.length < 2) {
      return { success: false, error: "At least 2 appointments are required for a series.", code: "VALIDATION_ERROR" };
    }

    // Check for conflicts per occurrence
    const conflicts: string[] = [];
    for (const occ of occurrences) {
      const { data: existing } = await supabase
        .from("appointments")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("resource_id", input.resourceId)
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
        error: `${conflicts.length} date(s) have scheduling conflicts. The series cannot be created.`,
        code: "SLOT_TAKEN",
        conflicts,
      };
    }

    // Claim idempotency (use the public booking request mechanism)
    const userSupabase = await createClient();
    const { data: claimData } = await userSupabase.rpc("claim_public_booking_request", {
      p_tenant_id: tenantId,
      p_idempotency_key: input.idempotencyKey,
      p_request_hash: `series:${input.serviceId}:${input.resourceId}:${rule.startsOn}:${rule.type}:${rule.occurrenceCount ?? 0}`,
    });

    if (claimData) {
      const claim = claimData as Record<string, unknown>;
      if (claim.status === "completed") {
        // Already created — idempotent response
        return { success: false, error: "This series was already created.", code: "BOOKING_UNAVAILABLE" };
      }
    }

    // Create series atomically
    const { data: series, error: seriesError } = await supabase
      .from("appointment_series")
      .insert({
        tenant_id: tenantId,
        customer_name: input.customerName,
        customer_email: input.customerEmail ?? null,
        customer_phone: input.customerPhone ?? null,
        customer_id: null,
        service_id: service.id,
        location_id: location.id,
        resource_id: resource.id,
        timezone: rule.timezone,
        recurrence_type: rule.type,
        recurrence_interval: rule.interval,
        days_of_week: rule.daysOfWeek ?? null,
        day_of_month: rule.dayOfMonth ?? null,
        starts_on: rule.startsOn,
        ends_on: rule.endsOn ?? null,
        occurrence_count: occurrences.length,
        starts_at_local_time: rule.startsAtLocalTime,
        duration_minutes: service.duration_minutes,
        buffer_before_minutes: service.buffer_before_minutes ?? 0,
        buffer_after_minutes: service.buffer_after_minutes ?? 0,
        service_name_snapshot: service.name,
        location_name_snapshot: location.name,
        resource_name_snapshot: resource.name,
        price: service.price,
        currency: service.currency,
        status: "active",
        created_by: null, // Public — no authenticated user
      } as never)
      .select("id")
      .single();

    if (seriesError || !series) {
      await log.failure(seriesError ?? new Error("Series insert failed"));
      return { success: false, error: "Unable to create recurring series.", code: "BOOKING_UNAVAILABLE" };
    }

    const seriesId = (series as unknown as { id: string }).id;

    // Create all appointment occurrences
    const appointmentRows = occurrences.map((occ) => ({
      tenant_id: tenantId,
      service_id: service.id,
      resource_id: resource.id,
      location_id: location.id,
      starts_at: occ.startsAtUtc,
      ends_at: occ.endsAtUtc,
      occupied_starts_at: occ.startsAtUtc,
      occupied_ends_at: occ.endsAtUtc,
      customer_name: input.customerName,
      customer_email: input.customerEmail ?? null,
      customer_phone: input.customerPhone ?? null,
      customer_id: null,
      status: "confirmed",
      service_name_snapshot: service.name,
      resource_name_snapshot: resource.name,
      location_name_snapshot: location.name,
      duration_minutes: service.duration_minutes,
      buffer_before_minutes: service.buffer_before_minutes ?? 0,
      buffer_after_minutes: service.buffer_after_minutes ?? 0,
      price: service.price,
      currency: service.currency,
      appointment_number: `SER-${seriesId.slice(0, 8).toUpperCase()}-${String(occ.index).padStart(2, "0")}`,
      series_id: seriesId,
      series_occurrence_index: occ.index,
      source: "public_booking",
      customer_notes: input.customerNotes ?? null,
      created_by: null,
    }));

    const { error: apptError } = await supabase
      .from("appointments")
      .insert(appointmentRows as never);

    if (apptError) {
      // Rollback series
      await supabase.from("appointment_series").delete().eq("id", seriesId);
      await log.failure(apptError);
      return { success: false, error: "Unable to create appointment series. Please try again.", code: "BOOKING_UNAVAILABLE" };
    }

    // Complete idempotency
    await userSupabase.rpc("complete_public_booking_request", {
      p_tenant_id: tenantId,
      p_idempotency_key: input.idempotencyKey,
      p_appointment_id: seriesId, // Use series ID as reference
      p_status: "completed",
    });

    await log.success({ seriesId, occurrences: occurrences.length });

    // Build confirmation for first occurrence
    const firstOcc = occurrences[0]!;
    const zonedStart = toZonedTime(new Date(firstOcc.startsAtUtc), rule.timezone);
    const endTime = new Date(new Date(firstOcc.startsAtUtc).getTime() + service.duration_minutes * 60_000);
    const zonedEnd = toZonedTime(endTime, rule.timezone);
    const recurrenceSummaryText = formatRecurrenceSummary(rule);

    const confirmation: PublicBookingConfirmation = {
      appointmentNumber: `SER-${seriesId.slice(0, 8).toUpperCase()}-01`,
      tenantName: tenant.name,
      serviceName: service.name,
      locationName: location.name,
      resourceName: settings.showResourceNames ? resource.name : null,
      localDate: format(zonedStart, "yyyy-MM-dd"),
      localStartTime: format(zonedStart, "HH:mm"),
      localEndTime: format(zonedEnd, "HH:mm"),
      timeZone: rule.timezone,
      durationMinutes: service.duration_minutes,
      price: String(service.price),
      currency: service.currency,
      customerName: input.customerName,
      confirmationMessage: settings.confirmationMessage,
      emailConfirmationEnqueued: false,
      remindersScheduled: false,
      paymentMethod: "pay_at_business",
      recurrenceSummary: recurrenceSummaryText,
      seriesOccurrenceCount: occurrences.length,
      startsAtUtc: firstOcc.startsAtUtc,
      endsAtUtc: firstOcc.endsAtUtc,
      locationAddress: location.name,
    };

    return { success: true, data: confirmation };
  } catch (error) {
    await log.failure(error instanceof Error ? error : new Error("Public series creation failed"));
    return { success: false, error: "Unable to complete your booking. Please try again.", code: "UNKNOWN_ERROR" };
  }
}
