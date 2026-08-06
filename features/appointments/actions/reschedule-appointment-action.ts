"use server";

/**
 * Server action for rescheduling an appointment — Milestone 6.9.
 *
 * Changes appointment time and optionally service/location/resource.
 * Recalculates all service snapshots from current configuration.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { appointmentRescheduleSchema } from "../schemas/appointment-schemas";
import { rescheduleAppointment } from "../services/update-appointment";
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
