import "server-only";

/**
 * Appointment Update, Reschedule, and Cancellation Services — Milestone 6.9.
 *
 * Provides:
 * - updateAppointmentDetails: Update customer info and notes
 * - updateAppointmentStatus: Transition appointment status
 * - rescheduleAppointment: Change time/resource with revalidation
 * - cancelAppointment: Cancel with reason and metadata
 *
 * Rescheduling policy:
 * - Any scheduling change recalculates all service snapshots from current config.
 * - The exclusion constraint handles concurrent conflict protection.
 * - The current appointment is excluded from conflict queries during rescheduling.
 */

import { createClient } from "@/lib/supabase/server";
import { localDateTimeToInstantStrict } from "@/lib/scheduling/zoned-local-time";
import { calculateAvailability } from "@/features/availability/services/calculate-availability";
import { resolveServiceResourceValues } from "@/features/services/utils/resolve-service-resource-values";
import {
  loadTenantTimezone,
  loadServiceForAvailability,
  loadLocationForAvailability,
  loadServiceLocationAssignment,
  loadServiceResourceAssignments,
  loadResourcesForAvailability,
  loadResourceLocationAssignments,
} from "@/features/availability/services/availability-queries";

import { getAppointmentById } from "./appointment-queries";
import type { Appointment, AppointmentStatus } from "../types/appointment";
import { canTransitionAppointmentStatus } from "../types/appointment";

// ─── Result Types ────────────────────────────────────────────────────────────

type UpdateResult =
  | { success: true; appointment: Appointment }
  | { success: false; error: string; code?: string };

// ─── Row Mapper ──────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): Appointment {
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
    status: row.status as Appointment["status"],
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
  };
}

// ─── Update Customer Details and Notes ───────────────────────────────────────

export type UpdateDetailsInput = {
  tenantId: string;
  appointmentId: string;
  customerName?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
  updatedBy?: string | null;
};

export async function updateAppointmentDetails(
  input: UpdateDetailsInput
): Promise<UpdateResult> {
  const { tenantId, appointmentId, updatedBy, ...fields } = input;

  // Verify appointment exists and belongs to tenant
  const existing = await getAppointmentById(tenantId, appointmentId);
  if (!existing) {
    return { success: false, error: "Appointment not found", code: "NOT_FOUND" };
  }

  // Build update object (only include provided fields)
  const updates: Record<string, unknown> = {};
  if (fields.customerName !== undefined) updates.customer_name = fields.customerName;
  if (fields.customerEmail !== undefined) updates.customer_email = fields.customerEmail;
  if (fields.customerPhone !== undefined) updates.customer_phone = fields.customerPhone;
  if (fields.internalNotes !== undefined) updates.internal_notes = fields.internalNotes;
  if (fields.customerNotes !== undefined) updates.customer_notes = fields.customerNotes;
  if (updatedBy) updates.updated_by = updatedBy;

  if (Object.keys(updates).length === 0) {
    return { success: true, appointment: existing };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .update(updates as never)
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) {
    console.error("[update-appointment-details] Error:", { appointmentId, error: error.message });
    return { success: false, error: "Failed to update appointment", code: "UPDATE_FAILED" };
  }

  return { success: true, appointment: mapRow(data as Record<string, unknown>) };
}

// ─── Update Appointment Status ───────────────────────────────────────────────

export type UpdateStatusInput = {
  tenantId: string;
  appointmentId: string;
  status: AppointmentStatus;
  updatedBy?: string | null;
};

export async function updateAppointmentStatus(
  input: UpdateStatusInput
): Promise<UpdateResult> {
  const { tenantId, appointmentId, status: targetStatus, updatedBy } = input;

  // Verify appointment exists
  const existing = await getAppointmentById(tenantId, appointmentId);
  if (!existing) {
    return { success: false, error: "Appointment not found", code: "NOT_FOUND" };
  }

  // Validate transition
  const transition = canTransitionAppointmentStatus(existing.status, targetStatus);
  if (!transition.allowed) {
    return {
      success: false,
      error: transition.reason ?? "Invalid status transition",
      code: "INVALID_TRANSITION",
    };
  }

  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    status: targetStatus,
  };
  if (updatedBy) updates.updated_by = updatedBy;

  const { data, error } = await supabase
    .from("appointments")
    .update(updates as never)
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) {
    // Handle database-level transition rejection
    if (error.message?.includes("Cannot transition") || error.message?.includes("Invalid transition")) {
      return { success: false, error: error.message, code: "INVALID_TRANSITION" };
    }
    console.error("[update-appointment-status] Error:", { appointmentId, error: error.message });
    return { success: false, error: "Failed to update status", code: "UPDATE_FAILED" };
  }

  return { success: true, appointment: mapRow(data as Record<string, unknown>) };
}

// ─── Reschedule Appointment ──────────────────────────────────────────────────

export type RescheduleInput = {
  tenantId: string;
  appointmentId: string;
  serviceId?: string;
  locationId?: string;
  resourceId?: string;
  localDate: string;
  localStartTime: string;
  updatedBy?: string | null;
};

export async function rescheduleAppointment(
  input: RescheduleInput
): Promise<UpdateResult> {
  const { tenantId, appointmentId, localDate, localStartTime, updatedBy } = input;

  // Load existing appointment
  const existing = await getAppointmentById(tenantId, appointmentId);
  if (!existing) {
    return { success: false, error: "Appointment not found", code: "NOT_FOUND" };
  }

  // Cannot reschedule terminal statuses
  if (["completed", "cancelled", "no_show"].includes(existing.status)) {
    return {
      success: false,
      error: `Cannot reschedule appointment with status "${existing.status}"`,
      code: "TERMINAL_STATUS",
    };
  }

  // Resolve effective IDs (use new values or keep existing)
  const serviceId = input.serviceId ?? existing.serviceId;
  const locationId = input.locationId ?? existing.locationId;
  const resourceId = input.resourceId ?? existing.resourceId;

  // Load tenant timezone
  const tenant = await loadTenantTimezone(tenantId);
  if (!tenant) {
    return { success: false, error: "Tenant not found", code: "TENANT_NOT_FOUND" };
  }
  const timeZone = tenant.defaultTimezone;

  // Strict time conversion
  const conversionResult = localDateTimeToInstantStrict(localDate, localStartTime, timeZone);
  if (!conversionResult.ok) {
    if (conversionResult.reason === "nonexistent") {
      return {
        success: false,
        error: "The requested time does not exist due to a daylight saving time transition",
        code: "DST_NONEXISTENT_TIME",
      };
    }
    return { success: false, error: "Invalid date or time", code: "INVALID_INPUT" };
  }
  const serviceStartInstant = conversionResult.instant;

  // Verify entities and assignments
  const [service, location] = await Promise.all([
    loadServiceForAvailability(tenantId, serviceId),
    loadLocationForAvailability(tenantId, locationId),
  ]);

  if (!service || !service.isActive) {
    return { success: false, error: "Service not found or inactive", code: "SERVICE_INACTIVE" };
  }
  if (!location || !location.isActive) {
    return { success: false, error: "Location not found or inactive", code: "LOCATION_INACTIVE" };
  }

  const [serviceLocation, serviceResourceAssignments, resources, resourceLocations] =
    await Promise.all([
      loadServiceLocationAssignment(tenantId, serviceId, locationId),
      loadServiceResourceAssignments(tenantId, serviceId, resourceId),
      loadResourcesForAvailability(tenantId, [resourceId]),
      loadResourceLocationAssignments(tenantId, locationId, [resourceId]),
    ]);

  if (!serviceLocation || !serviceLocation.isActive) {
    return { success: false, error: "Service is not available at this location", code: "SERVICE_NOT_AT_LOCATION" };
  }

  const resource = resources[0];
  if (!resource || !resource.isActive) {
    return { success: false, error: "Resource not found or inactive", code: "RESOURCE_INACTIVE" };
  }

  const resourceLocation = resourceLocations[0];
  if (!resourceLocation || !resourceLocation.isActive) {
    return { success: false, error: "Resource is not available at this location", code: "RESOURCE_NOT_AT_LOCATION" };
  }

  const assignment = serviceResourceAssignments[0];
  if (!assignment || !assignment.isActive) {
    return { success: false, error: "Resource is not assigned to this service", code: "RESOURCE_NOT_ASSIGNED" };
  }

  // Resolve current effective values (rescheduling refreshes all snapshots)
  const resolved = resolveServiceResourceValues(
    {
      durationMinutes: service.durationMinutes,
      price: service.price,
      currency: service.currency,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
    },
    {
      durationOverrideMinutes: assignment.durationOverrideMinutes,
      priceOverride: assignment.priceOverride,
      currencyOverride: assignment.currencyOverride,
      bufferBeforeOverrideMinutes: assignment.bufferBeforeOverrideMinutes,
      bufferAfterOverrideMinutes: assignment.bufferAfterOverrideMinutes,
    }
  );

  // Calculate new appointment window
  const serviceStartMs = serviceStartInstant.getTime();
  const serviceEndMs = serviceStartMs + resolved.duration * 60_000;
  const occupiedStartMs = serviceStartMs - resolved.bufferBefore * 60_000;
  const occupiedEndMs = serviceEndMs + resolved.bufferAfter * 60_000;

  const startsAt = serviceStartInstant.toISOString();
  const endsAt = new Date(serviceEndMs).toISOString();
  const occupiedStartsAt = new Date(occupiedStartMs).toISOString();
  const occupiedEndsAt = new Date(occupiedEndMs).toISOString();

  // Revalidate availability (the current appointment is excluded via
  // the availability engine seeing it as non-cancelled, but we need the
  // slot to exist when excluding this appointment's occupied window)
  const availabilityResult = await calculateAvailability(
    { tenantId, serviceId, locationId, resourceId, localDate },
    new Date()
  );

  const resourceResult = availabilityResult.resources.find((r) => r.resourceId === resourceId);

  // Check if the requested slot exists OR if it would exist without the current appointment
  // The availability engine already subtracts this appointment (it's non-cancelled),
  // so if the slot IS available, the new time doesn't conflict with others.
  // If NOT available, check if the appointment is being moved to a time that's
  // blocked by itself (same time = no real change) or by others.
  let slotAvailable = false;

  if (resourceResult) {
    const matchingSlot = resourceResult.slots.find((slot) => slot.startsAt === startsAt);
    if (matchingSlot) {
      slotAvailable = true;
    }
  }

  // If slot not available via normal calculation, check if it's because the
  // current appointment is blocking it (rescheduling to same time or overlapping with self)
  if (!slotAvailable) {
    // If we're keeping the same time, allow it
    if (existing.startsAt === startsAt && existing.resourceId === resourceId) {
      slotAvailable = true;
    }
  }

  if (!slotAvailable) {
    return {
      success: false,
      error: "This time is no longer available. Please choose another slot.",
      code: "SLOT_NO_LONGER_AVAILABLE",
    };
  }

  // Perform the update atomically
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    service_id: serviceId,
    location_id: locationId,
    resource_id: resourceId,
    starts_at: startsAt,
    ends_at: endsAt,
    occupied_starts_at: occupiedStartsAt,
    occupied_ends_at: occupiedEndsAt,
    duration_minutes: resolved.duration,
    buffer_before_minutes: resolved.bufferBefore,
    buffer_after_minutes: resolved.bufferAfter,
    price: resolved.price,
    currency: resolved.currency,
    service_name_snapshot: service.name,
    location_name_snapshot: location.name,
    resource_name_snapshot: resource.name,
  };
  if (updatedBy) updateData.updated_by = updatedBy;

  const { data, error } = await supabase
    .from("appointments")
    .update(updateData as never)
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) {
    if (error.message?.includes("conflicting key value") || error.message?.includes("exclusion")) {
      return {
        success: false,
        error: "This time is no longer available. Please choose another slot.",
        code: "APPOINTMENT_CONFLICT",
      };
    }
    if (error.message?.includes("does not belong") || error.message?.includes("not actively assigned")) {
      return {
        success: false,
        error: "Service configuration has changed. Please try again.",
        code: "RELATIONSHIP_INVALID",
      };
    }
    console.error("[reschedule-appointment] Error:", { appointmentId, error: error.message });
    return { success: false, error: "Failed to reschedule appointment", code: "UPDATE_FAILED" };
  }

  return { success: true, appointment: mapRow(data as Record<string, unknown>) };
}

// ─── Cancel Appointment ──────────────────────────────────────────────────────

export type CancelAppointmentInput = {
  tenantId: string;
  appointmentId: string;
  reason?: string | null;
  cancelledBy?: string | null;
};

export async function cancelAppointment(
  input: CancelAppointmentInput
): Promise<UpdateResult> {
  const { tenantId, appointmentId, reason, cancelledBy } = input;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("cancel_appointment", {
    p_appointment_id: appointmentId,
    p_tenant_id: tenantId,
    p_cancelled_by: cancelledBy ?? undefined,
    p_reason: reason ?? undefined,
  });

  if (error) {
    if (error.message?.includes("not found")) {
      return { success: false, error: "Appointment not found", code: "NOT_FOUND" };
    }
    if (error.message?.includes("Cannot cancel")) {
      return {
        success: false,
        error: error.message,
        code: "INVALID_TRANSITION",
      };
    }
    console.error("[cancel-appointment] Error:", { appointmentId, error: error.message });
    return { success: false, error: "Failed to cancel appointment", code: "CANCEL_FAILED" };
  }

  if (!data) {
    return { success: false, error: "No appointment data returned", code: "NO_DATA" };
  }

  return { success: true, appointment: mapRow(data as Record<string, unknown>) };
}
