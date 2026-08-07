import "server-only";

/**
 * Appointment Creation Service — Milestone 6.9.
 *
 * Orchestrates the full appointment creation workflow:
 * 1. Authenticate caller (done by server action before calling this)
 * 2. Load tenant timezone
 * 3. Strictly convert requested local time to instant
 * 4. Reload service, location, resource, and assignments
 * 5. Resolve effective service-resource values
 * 6. Recalculate current availability for that resource and date
 * 7. Resolve current booking rules
 * 8. Confirm the exact requested slot remains permitted
 * 9. Generate snapshot values
 * 10. Call insert_appointment_atomic RPC
 * 11. Let database exclusion constraint reject concurrent conflicts
 * 12. Return the created appointment
 *
 * Architecture:
 * - TypeScript validates availability and resolves trusted values
 * - Database RPC atomically inserts with relationship + interval validation
 * - Exclusion constraint handles concurrent conflict protection
 *
 * Consistency boundary:
 * - Configuration could change between TypeScript calculation and DB insert.
 * - The DB triggers revalidate entity relationships and active states.
 * - The exclusion constraint prevents double-booking regardless.
 * - This is NOT a single serializable transaction across all inputs,
 *   but is safe against conflicts and stale relationship data.
 */

import { createClient } from "@/lib/supabase/server";
import { localDateTimeToInstantStrict } from "@/lib/scheduling/zoned-local-time";
import { calculateAvailability } from "@/features/availability/services/calculate-availability";
import { resolveServiceResourceValues } from "@/features/services/utils/resolve-service-resource-values";
import { getResolvedBookingRules } from "@/features/booking-rules/services/get-booking-rules";
import {
    loadTenantTimezone,
    loadServiceForAvailability,
    loadLocationForAvailability,
    loadServiceLocationAssignment,
    loadServiceResourceAssignments,
    loadResourcesForAvailability,
    loadResourceLocationAssignments,
} from "@/features/availability/services/availability-queries";

import type { Appointment, AppointmentStatus, AppointmentSource } from "../types/appointment";

// ─── Input Type ──────────────────────────────────────────────────────────────

export type CreateAppointmentInput = {
    tenantId: string;
    serviceId: string;
    locationId: string;
    resourceId: string;
    customerId?: string | null;
    customerName: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    localDate: string;
    localStartTime: string;
    status?: AppointmentStatus;
    source?: AppointmentSource;
    internalNotes?: string | null;
    customerNotes?: string | null;
    createdBy?: string | null;
};

// ─── Result Type ─────────────────────────────────────────────────────────────

export type CreateAppointmentResult =
    | { success: true; appointment: Appointment }
    | { success: false; error: string; code?: string };

// ─── Main Service ────────────────────────────────────────────────────────────

export async function createAppointment(
    input: CreateAppointmentInput
): Promise<CreateAppointmentResult> {
    const {
        tenantId,
        serviceId,
        locationId,
        resourceId,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        localDate,
        localStartTime,
        status = "confirmed",
        source = "internal",
        internalNotes,
        customerNotes,
        createdBy,
    } = input;

    // ─── Step 1: Load tenant timezone ──────────────────────────────────────────
    const tenant = await loadTenantTimezone(tenantId);
    if (!tenant) {
        return { success: false, error: "Tenant not found", code: "TENANT_NOT_FOUND" };
    }
    const timeZone = tenant.defaultTimezone;

    // ─── Step 2: Strictly convert local time to instant ────────────────────────
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

    // ─── Step 3: Load and verify entities ──────────────────────────────────────
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

    // ─── Step 4: Verify assignments ────────────────────────────────────────────
    const [serviceLocation, serviceResourceAssignments, resources, resourceLocations] =
        await Promise.all([
            loadServiceLocationAssignment(tenantId, serviceId, locationId),
            loadServiceResourceAssignments(tenantId, serviceId, resourceId),
            loadResourcesForAvailability(tenantId, [resourceId]),
            loadResourceLocationAssignments(tenantId, locationId, [resourceId]),
        ]);

    if (!serviceLocation || !serviceLocation.isActive) {
        return {
            success: false,
            error: "Service is not available at this location",
            code: "SERVICE_NOT_AT_LOCATION",
        };
    }

    const resource = resources[0];
    if (!resource || !resource.isActive) {
        return { success: false, error: "Resource not found or inactive", code: "RESOURCE_INACTIVE" };
    }

    const resourceLocation = resourceLocations[0];
    if (!resourceLocation || !resourceLocation.isActive) {
        return {
            success: false,
            error: "Resource is not available at this location",
            code: "RESOURCE_NOT_AT_LOCATION",
        };
    }

    const serviceResourceAssignment = serviceResourceAssignments[0];
    if (!serviceResourceAssignment || !serviceResourceAssignment.isActive) {
        return {
            success: false,
            error: "Resource is not assigned to this service",
            code: "RESOURCE_NOT_ASSIGNED",
        };
    }

    // ─── Step 5: Resolve effective service-resource values ─────────────────────
    const resolved = resolveServiceResourceValues(
        {
            durationMinutes: service.durationMinutes,
            price: service.price,
            currency: service.currency,
            bufferBeforeMinutes: service.bufferBeforeMinutes,
            bufferAfterMinutes: service.bufferAfterMinutes,
        },
        {
            durationOverrideMinutes: serviceResourceAssignment.durationOverrideMinutes,
            priceOverride: serviceResourceAssignment.priceOverride,
            currencyOverride: serviceResourceAssignment.currencyOverride,
            bufferBeforeOverrideMinutes: serviceResourceAssignment.bufferBeforeOverrideMinutes,
            bufferAfterOverrideMinutes: serviceResourceAssignment.bufferAfterOverrideMinutes,
        }
    );

    // ─── Step 6: Calculate appointment window ──────────────────────────────────
    const serviceStartMs = serviceStartInstant.getTime();
    const serviceEndMs = serviceStartMs + resolved.duration * 60_000;
    const occupiedStartMs = serviceStartMs - resolved.bufferBefore * 60_000;
    const occupiedEndMs = serviceEndMs + resolved.bufferAfter * 60_000;

    const startsAt = serviceStartInstant.toISOString();
    const endsAt = new Date(serviceEndMs).toISOString();
    const occupiedStartsAt = new Date(occupiedStartMs).toISOString();
    const occupiedEndsAt = new Date(occupiedEndMs).toISOString();

    // ─── Step 7: Revalidate availability (exact slot must exist) ───────────────
    const availabilityResult = await calculateAvailability(
        {
            tenantId,
            serviceId,
            locationId,
            resourceId,
            localDate,
        },
        new Date()
    );

    // Find the exact slot matching our requested start time
    const resourceResult = availabilityResult.resources.find((r) => r.resourceId === resourceId);
    if (!resourceResult || resourceResult.slots.length === 0) {
        return {
            success: false,
            error: "This time is no longer available. Please choose another slot.",
            code: "SLOT_NO_LONGER_AVAILABLE",
        };
    }

    const matchingSlot = resourceResult.slots.find(
        (slot) => slot.startsAt === startsAt
    );

    if (!matchingSlot) {
        return {
            success: false,
            error: "This time is no longer available. Please choose another slot.",
            code: "SLOT_NO_LONGER_AVAILABLE",
        };
    }

    // ─── Step 8: Validate booking rules for customer fields ────────────────────
    try {
        const bookingRules = await getResolvedBookingRules(tenantId, serviceId);
        if (bookingRules.requireCustomerEmail && !customerEmail) {
            return {
                success: false,
                error: "Customer email is required for this service",
                code: "CUSTOMER_EMAIL_REQUIRED",
            };
        }
        if (bookingRules.requireCustomerPhone && !customerPhone) {
            return {
                success: false,
                error: "Customer phone is required for this service",
                code: "CUSTOMER_PHONE_REQUIRED",
            };
        }
    } catch {
        // If booking rules cannot be loaded, continue without field enforcement
    }

    // ─── Step 9: Build snapshot values ─────────────────────────────────────────
    const serviceNameSnapshot = service.name;
    const locationNameSnapshot = location.name;
    const resourceNameSnapshot = resource.name;

    // ─── Step 10: Call atomic insert RPC ───────────────────────────────────────
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("insert_appointment_atomic", {
        p_tenant_id: tenantId,
        p_service_id: serviceId,
        p_location_id: locationId,
        p_resource_id: resourceId,
        p_customer_id: customerId ?? undefined,
        p_customer_name: customerName,
        p_customer_email: customerEmail ?? undefined,
        p_customer_phone: customerPhone ?? undefined,
        p_status: status,
        p_source: source,
        p_starts_at: startsAt,
        p_ends_at: endsAt,
        p_occupied_starts_at: occupiedStartsAt,
        p_occupied_ends_at: occupiedEndsAt,
        p_duration_minutes: resolved.duration,
        p_buffer_before_minutes: resolved.bufferBefore,
        p_buffer_after_minutes: resolved.bufferAfter,
        p_price: resolved.price,
        p_currency: resolved.currency,
        p_service_name_snapshot: serviceNameSnapshot,
        p_location_name_snapshot: locationNameSnapshot,
        p_resource_name_snapshot: resourceNameSnapshot,
        p_internal_notes: internalNotes ?? undefined,
        p_customer_notes: customerNotes ?? undefined,
        p_created_by: createdBy ?? undefined,
    });

    // ─── Step 11: Handle result ────────────────────────────────────────────────
    if (error) {
        // Check for exclusion constraint conflict
        if (error.message?.includes("conflicting key value") || error.message?.includes("exclusion")) {
            return {
                success: false,
                error: "This time is no longer available. Please choose another slot.",
                code: "APPOINTMENT_CONFLICT",
            };
        }
        // Check for relationship validation failures
        if (error.message?.includes("does not belong") || error.message?.includes("not actively assigned")) {
            return {
                success: false,
                error: "Service configuration has changed. Please try again.",
                code: "RELATIONSHIP_INVALID",
            };
        }
        // Check for interval consistency failures
        if (error.message?.includes("does not match")) {
            return {
                success: false,
                error: "Internal error: interval consistency check failed",
                code: "INTERVAL_INCONSISTENT",
            };
        }

        console.error("[create-appointment] RPC error:", {
            tenantId,
            serviceId,
            resourceId,
            localDate,
            localStartTime,
            errorMessage: error.message,
        });

        return {
            success: false,
            error: "Failed to create appointment. Please try again.",
            code: "INSERT_FAILED",
        };
    }

    if (!data) {
        return { success: false, error: "No appointment data returned", code: "NO_DATA" };
    }

    // ─── Step 12: Map and return ───────────────────────────────────────────────
    const row = data as Record<string, unknown>;
    const appointment: Appointment = {
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
        source: row.source as AppointmentSource,
        startsAt: row.starts_at as string,
        endsAt: row.ends_at as string,
        occupiedStartsAt: row.occupied_starts_at as string,
        occupiedEndsAt: row.occupied_ends_at as string,
        checkedInAt: (row.checked_in_at as string) ?? null,
        serviceStartedAt: (row.service_started_at as string) ?? null,
        completedAt: (row.completed_at as string) ?? null,
        noShowAt: (row.no_show_at as string) ?? null,
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

    return { success: true, appointment };
}
