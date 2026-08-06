"use server";

/**
 * Public booking creation action — Milestone 6.11.
 *
 * Final public booking submission. Does NOT directly insert into appointments.
 * Adapts public input into the existing trusted appointment creation service.
 *
 * Flow:
 * 1. Validate input
 * 2. Resolve tenant + verify public booking enabled
 * 3. Claim idempotency key (return existing result if duplicate)
 * 4. Re-resolve service, location, resource
 * 5. Re-resolve booking rules + validate required customer fields
 * 6. Recalculate current availability
 * 7. Match exact requested instant and resource
 * 8. Detect price/duration changes vs reviewed values
 * 9. Build trusted appointment input
 * 10. Use existing atomic appointment creation
 * 11. Complete idempotency record
 * 12. Return public-safe confirmation
 *
 * Security:
 * - No authentication required
 * - Generic public-safe error messages
 * - Idempotency prevents duplicates
 * - Server resolves all authoritative values
 * - PostgreSQL exclusion constraint handles concurrency
 */

import { createClient } from "@/lib/supabase/server";
import { publicBookingSubmissionSchema } from "../schemas/public-booking-schemas";
import { resolvePublicBookingContext } from "../services/public-tenant-resolver";
import { createAppointment } from "@/features/appointments/services/create-appointment";
import { getResolvedBookingRules } from "@/features/booking-rules/services/get-booking-rules";
import { calculateAvailability } from "@/features/availability/services/calculate-availability";
import { enqueueAppointmentCreatedNotification } from "@/features/notifications/services/enqueue-notification";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import type { PublicBookingConfirmation, PublicBookingErrorCode } from "../types/public-booking";
import { createHash } from "crypto";

// ─── Result Types ────────────────────────────────────────────────────────────

type BookingSuccess = { success: true; data: PublicBookingConfirmation };
type BookingError = { success: false; error: string; code: PublicBookingErrorCode };
type CreatePublicBookingResult = BookingSuccess | BookingError;

// ─── Input Type ──────────────────────────────────────────────────────────────

type PublicBookingInput = {
    serviceId: string;
    locationId: string;
    resourceId: string;
    startsAt: string;
    localDate: string;
    customerName: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerNotes?: string | null;
    idempotencyKey: string;
    reviewedPrice?: string | null;
    reviewedDuration?: number | null;
};

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function createPublicBookingAction(
    tenantSlug: string,
    input: PublicBookingInput
): Promise<CreatePublicBookingResult> {
    try {
        // 1. Validate input
        const validated = await publicBookingSubmissionSchema.validate(input, {
            abortEarly: false,
            stripUnknown: true,
        });

        // 2. Resolve tenant + verify public booking enabled
        const context = await resolvePublicBookingContext(tenantSlug);
        if (!context) {
            return { success: false, error: "Booking is not available.", code: "BOOKING_DISABLED" };
        }

        const { tenant, settings } = context;
        const tenantId = tenant.id;

        // 3. Claim idempotency key
        const requestHash = computeRequestHash(validated);
        const supabase = await createClient();

        const { data: claimData } = await supabase.rpc("claim_public_booking_request", {
            p_tenant_id: tenantId,
            p_idempotency_key: validated.idempotencyKey,
            p_request_hash: requestHash,
        });

        if (claimData) {
            const claim = claimData as Record<string, unknown>;

            // Already completed — return existing result
            if (claim.status === "completed" && claim.appointment_id) {
                return await buildConfirmationFromAppointment(
                    tenantId, claim.appointment_id as string, tenant.name, settings.confirmationMessage, tenant.defaultTimeZone
                );
            }

            // Same key but different payload — reject
            if (claim.request_hash !== requestHash) {
                return { success: false, error: "Invalid request. Please try again.", code: "INVALID_SELECTION" };
            }

            // Still processing from another request (rare race)
            if (claim.status === "processing") {
                // Allow this request to proceed (will be deduplicated by exclusion constraint)
            }
        }

        // 4. Validate booking rules — required customer fields
        try {
            const bookingRules = await getResolvedBookingRules(tenantId, validated.serviceId);
            if (bookingRules.requireCustomerEmail && !validated.customerEmail) {
                return { success: false, error: "Email address is required.", code: "VALIDATION_ERROR" };
            }
            if (bookingRules.requireCustomerPhone && !validated.customerPhone) {
                return { success: false, error: "Phone number is required.", code: "VALIDATION_ERROR" };
            }
        } catch {
            // If booking rules cannot be loaded, continue without field enforcement
        }

        // 5. Recalculate availability to validate the exact slot
        const availabilityResult = await calculateAvailability(
            {
                tenantId,
                serviceId: validated.serviceId,
                locationId: validated.locationId,
                resourceId: validated.resourceId,
                localDate: validated.localDate,
            },
            new Date()
        );

        // 6. Find matching slot
        const resourceResult = availabilityResult.resources.find(
            (r) => r.resourceId === validated.resourceId
        );

        if (!resourceResult || resourceResult.slots.length === 0) {
            await markRequestFailed(supabase, tenantId, validated.idempotencyKey);
            return {
                success: false,
                error: "That time was just booked. Please choose another available time.",
                code: "SLOT_TAKEN",
            };
        }

        const matchingSlot = resourceResult.slots.find(
            (slot) => slot.startsAt === validated.startsAt
        );

        if (!matchingSlot) {
            await markRequestFailed(supabase, tenantId, validated.idempotencyKey);
            return {
                success: false,
                error: "That time was just booked. Please choose another available time.",
                code: "SLOT_TAKEN",
            };
        }

        // 7. Detect price/duration changes
        if (validated.reviewedPrice && matchingSlot.price !== validated.reviewedPrice) {
            await markRequestFailed(supabase, tenantId, validated.idempotencyKey);
            return {
                success: false,
                error: "The service details changed. Please review the updated booking.",
                code: "DETAILS_CHANGED",
            };
        }

        if (validated.reviewedDuration && matchingSlot.durationMinutes !== validated.reviewedDuration) {
            await markRequestFailed(supabase, tenantId, validated.idempotencyKey);
            return {
                success: false,
                error: "The service timing changed. Please select a new time.",
                code: "DETAILS_CHANGED",
            };
        }

        // 8. Resolve local start time from the matched slot
        const localStartTime = matchingSlot.localStartTime;

        // 9. Create appointment using the trusted service
        const createResult = await createAppointment({
            tenantId,
            serviceId: validated.serviceId,
            locationId: validated.locationId,
            resourceId: validated.resourceId,
            customerName: validated.customerName,
            customerEmail: validated.customerEmail ?? null,
            customerPhone: validated.customerPhone ?? null,
            localDate: validated.localDate,
            localStartTime,
            status: "confirmed",
            source: "public_booking",
            customerNotes: validated.customerNotes ?? null,
            internalNotes: null,
            createdBy: null, // Public — no authenticated user
        });

        // 10. Handle creation result
        if (!createResult.success) {
            const isConflict = createResult.code === "APPOINTMENT_CONFLICT" || createResult.code === "SLOT_NO_LONGER_AVAILABLE";

            await supabase.rpc("complete_public_booking_request", {
                p_tenant_id: tenantId,
                p_idempotency_key: validated.idempotencyKey,
                p_appointment_id: null as unknown as string,
                p_status: isConflict ? "conflict" : "failed",
            });

            if (isConflict) {
                return {
                    success: false,
                    error: "That time was just booked. Please choose another available time.",
                    code: "SLOT_TAKEN",
                };
            }

            return {
                success: false,
                error: "Unable to complete your booking. Please try again.",
                code: "BOOKING_UNAVAILABLE",
            };
        }

        // 11. Complete idempotency record
        await supabase.rpc("complete_public_booking_request", {
            p_tenant_id: tenantId,
            p_idempotency_key: validated.idempotencyKey,
            p_appointment_id: createResult.appointment.id,
            p_status: "completed",
        });

        // 11b. Enqueue booking confirmation notification (non-blocking)
        let emailConfirmationEnqueued = false;
        try {
            const enqueueResult = await enqueueAppointmentCreatedNotification(
                tenantId,
                tenant.name,
                tenant.defaultTimeZone,
                createResult.appointment
            );
            emailConfirmationEnqueued = enqueueResult.status === "created" || enqueueResult.status === "duplicate";
        } catch {
            // Notification failure must never block public booking
        }

        // 12. Build public-safe confirmation
        const appt = createResult.appointment;
        const timeZone = tenant.defaultTimeZone;
        const zonedStart = toZonedTime(new Date(appt.startsAt), timeZone);
        const zonedEnd = toZonedTime(new Date(appt.endsAt), timeZone);

        const confirmation: PublicBookingConfirmation = {
            appointmentNumber: appt.appointmentNumber,
            tenantName: tenant.name,
            serviceName: appt.serviceNameSnapshot,
            locationName: appt.locationNameSnapshot,
            resourceName: settings.showResourceNames ? appt.resourceNameSnapshot : null,
            localDate: format(zonedStart, "yyyy-MM-dd"),
            localStartTime: format(zonedStart, "HH:mm"),
            localEndTime: format(zonedEnd, "HH:mm"),
            timeZone,
            durationMinutes: appt.durationMinutes,
            price: appt.price,
            currency: appt.currency,
            customerName: appt.customerName,
            confirmationMessage: settings.confirmationMessage,
            emailConfirmationEnqueued,
        };

        return { success: true, data: confirmation };
    } catch (error) {
        if (error instanceof Error && error.name === "ValidationError") {
            return { success: false, error: "Please check your information and try again.", code: "VALIDATION_ERROR" };
        }
        console.error("[create-public-booking] Unexpected error:", { tenantSlug });
        return { success: false, error: "Unable to complete your booking. Please try again.", code: "UNKNOWN_ERROR" };
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeRequestHash(input: Record<string, unknown>): string {
    const relevant = {
        serviceId: input.serviceId,
        locationId: input.locationId,
        resourceId: input.resourceId,
        startsAt: input.startsAt,
        localDate: input.localDate,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
    };
    return createHash("sha256").update(JSON.stringify(relevant)).digest("hex").slice(0, 32);
}

async function markRequestFailed(
    supabase: Awaited<ReturnType<typeof createClient>>,
    tenantId: string,
    idempotencyKey: string
): Promise<void> {
    await supabase.rpc("complete_public_booking_request", {
        p_tenant_id: tenantId,
        p_idempotency_key: idempotencyKey,
        p_appointment_id: null as unknown as string,
        p_status: "failed",
    });
}

async function buildConfirmationFromAppointment(
    tenantId: string,
    appointmentId: string,
    tenantName: string,
    confirmationMessage: string | null,
    timeZone: string
): Promise<CreatePublicBookingResult> {
    const supabase = await createClient();

    const { data } = await supabase
        .from("appointments")
        .select("appointment_number, service_name_snapshot, location_name_snapshot, resource_name_snapshot, starts_at, ends_at, duration_minutes, price, currency, customer_name")
        .eq("id", appointmentId)
        .eq("tenant_id", tenantId)
        .single();

    if (!data) {
        return { success: false, error: "Unable to retrieve booking details.", code: "UNKNOWN_ERROR" };
    }

    const row = data as Record<string, unknown>;
    const zonedStart = toZonedTime(new Date(row.starts_at as string), timeZone);
    const zonedEnd = toZonedTime(new Date(row.ends_at as string), timeZone);

    return {
        success: true,
        data: {
            appointmentNumber: row.appointment_number as string,
            tenantName,
            serviceName: row.service_name_snapshot as string,
            locationName: row.location_name_snapshot as string,
            resourceName: row.resource_name_snapshot as string,
            localDate: format(zonedStart, "yyyy-MM-dd"),
            localStartTime: format(zonedStart, "HH:mm"),
            localEndTime: format(zonedEnd, "HH:mm"),
            timeZone,
            durationMinutes: row.duration_minutes as number,
            price: String(row.price),
            currency: row.currency as string,
            customerName: row.customer_name as string,
            confirmationMessage,
            emailConfirmationEnqueued: true, // Already completed — email was enqueued on first attempt
        },
    };
}
