"use server";

/**
 * Server action for rescheduling an appointment — Milestone 6.9.
 * Notification integration added in Milestone 6.12.
 *
 * Changes appointment time and optionally service/location/resource.
 * Recalculates all service snapshots from current configuration.
 * Enqueues a rescheduling notification on success.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { appointmentRescheduleSchema } from "../schemas/appointment-schemas";
import { rescheduleAppointment } from "../services/update-appointment";
import { getAppointmentById } from "../services/appointment-queries";
import { enqueueAppointmentRescheduledNotification } from "@/features/notifications/services/enqueue-notification";
import { loadTenantTimezone } from "@/features/availability/services/availability-queries";
import type { Appointment } from "../types/appointment";

type ActionSuccess = { success: true; data: Appointment };
type ActionError = { success: false; error: string; code?: string };
type RescheduleActionResult = ActionSuccess | ActionError;

export async function rescheduleAppointmentAction(
  tenantSlug: string,
  appointmentId: string,
  input: {
    serviceId?: string;
    locationId?: string;
    resourceId?: string;
    localDate: string;
    localStartTime: string;
  }
): Promise<RescheduleActionResult> {
  try {
    const { user, tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
    }

    const validated = await appointmentRescheduleSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });

    // Load existing appointment to capture previous times for notification
    const existing = await getAppointmentById(tenant.id, appointmentId);
    const previousStartsAt = existing?.startsAt;
    const previousEndsAt = existing?.endsAt;

    const result = await rescheduleAppointment({
      tenantId: tenant.id,
      appointmentId,
      serviceId: validated.serviceId,
      locationId: validated.locationId,
      resourceId: validated.resourceId,
      localDate: validated.localDate,
      localStartTime: validated.localStartTime,
      updatedBy: user.id,
    });

    if (!result.success) {
      return { success: false, error: result.error, code: result.code };
    }

    // Enqueue rescheduling notification only if scheduling actually changed
    const schedulingChanged =
      result.appointment.startsAt !== previousStartsAt ||
      result.appointment.endsAt !== previousEndsAt ||
      result.appointment.serviceId !== existing?.serviceId ||
      result.appointment.locationId !== existing?.locationId ||
      result.appointment.resourceId !== existing?.resourceId;

    if (schedulingChanged && previousStartsAt && previousEndsAt) {
      try {
        const tenantTz = await loadTenantTimezone(tenant.id);
        const timeZone = tenantTz?.defaultTimezone ?? "UTC";
        await enqueueAppointmentRescheduledNotification(
          tenant.id,
          tenant.name,
          timeZone,
          result.appointment,
          previousStartsAt,
          previousEndsAt
        );
      } catch {
        // Notification failure must never block rescheduling
      }
    }

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
    console.error("[reschedule-appointment-action] Error:", { tenantSlug, appointmentId });
    return { success: false, error: "Failed to reschedule appointment" };
  }
}
