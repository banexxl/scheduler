"use server";

/**
 * Server action for cancelling an appointment — Milestone 6.9.
 * Notification integration added in Milestone 6.12.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { appointmentCancellationSchema } from "../schemas/appointment-schemas";
import { cancelAppointment } from "../services/update-appointment";
import { enqueueAppointmentCancelledNotification } from "@/features/notifications/services/enqueue-notification";
import { loadTenantTimezone } from "@/features/availability/services/availability-queries";
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

    if (!["owner", "admin"].includes(membership.role)) {
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
    console.error("[cancel-appointment-action] Error:", { tenantSlug, appointmentId });
    return { success: false, error: "Failed to cancel appointment" };
  }
}
