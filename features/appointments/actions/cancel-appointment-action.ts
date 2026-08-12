"use server";

/**
 * Server action for cancelling an appointment — Milestone 6.9.
 * Notification integration added in Milestone 6.12.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { appointmentCancellationSchema } from "../schemas/appointment-schemas";
import { cancelAppointment } from "../services/update-appointment";
import { enqueueAppointmentCancelledNotification } from "@/features/notifications/services/enqueue-notification";
import { cancelRemindersAfterCancellation } from "@/features/notifications/services/reminder-sync-service";
import { loadTenantTimezone } from "@/features/availability/services/availability-queries";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import type { Appointment } from "../types/appointment";

type ActionSuccess = { success: true; data: Appointment };
type ActionError = { success: false; error: string; code?: string };
type CancelAppointmentActionResult = ActionSuccess | ActionError;

export async function cancelAppointmentAction(
  tenantSlug: string,
  appointmentId: string,
  input: { reason?: string | null }
): Promise<CancelAppointmentActionResult> {
  try {
    const { user, tenant, membership } = await requireTenantMember(tenantSlug);
    const log = createServerActionLogger({
      action: "appointments.cancel",
      tenantId: tenant.id,
      userId: user.id,
    });

    if (!["owner", "admin"].includes(membership.role)) {
      await log.unauthorized();
      return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
    }

    const validated = await appointmentCancellationSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await cancelAppointment({
      tenantId: tenant.id,
      appointmentId,
      reason: validated.reason ?? null,
      cancelledBy: user.id,
    });

    if (!result.success) {
      return { success: false, error: result.error, code: result.code };
    }

    // Enqueue cancellation notification (non-blocking)
    try {
      const tenantTz = await loadTenantTimezone(tenant.id);
      const timeZone = tenantTz?.defaultTimezone ?? "UTC";
      await enqueueAppointmentCancelledNotification(
        tenant.id,
        tenant.name,
        timeZone,
        result.appointment,
        validated.reason
      );
    } catch {
      // Notification failure must never block cancellation
    }

    // Cancel pending reminders (non-blocking)
    try {
      await cancelRemindersAfterCancellation(tenant.id, result.appointment.id);
    } catch {
      // Reminder cancellation failure must never block appointment cancellation
    }

    // Trigger waitlist matching for the freed slot (non-blocking)
    try {
      const { triggerWaitlistMatchingForSlot } = await import("@/features/waitlist/services/waitlist-matching");
      const tenantTz = await loadTenantTimezone(tenant.id);
      await triggerWaitlistMatchingForSlot({
        tenantId: tenant.id,
        serviceId: result.appointment.serviceId,
        locationId: result.appointment.locationId,
        resourceId: result.appointment.resourceId,
        startsAt: result.appointment.startsAt,
        endsAt: result.appointment.endsAt,
        timeZone: tenantTz?.defaultTimezone ?? "UTC",
      });
    } catch {
      // Waitlist matching failure must never block cancellation
    }

    await log.success({ appointmentId });
    return { success: true, data: result.appointment };
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      const validationError = error as { errors?: string[] };
      return {
        success: false,
        error: validationError.errors?.join(", ") ?? "Validation failed",
        code: "VALIDATION_ERROR",
      };
    }
    return { success: false, error: "Failed to cancel appointment" };
  }
}
