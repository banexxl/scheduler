"use server";

/**
 * Server action for updating appointment status — Milestone 6.9.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { appointmentStatusUpdateSchema } from "../schemas/appointment-schemas";
import { updateAppointmentStatus } from "../services/update-appointment";
import type { Appointment, AppointmentStatus } from "../types/appointment";

type ActionSuccess = { success: true; data: Appointment };
type ActionError = { success: false; error: string; code?: string };
type UpdateStatusActionResult = ActionSuccess | ActionError;

export async function updateAppointmentStatusAction(
  tenantSlug: string,
  appointmentId: string,
  input: { status: string }
): Promise<UpdateStatusActionResult> {
  try {
    const { user, tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
    }

    const validated = await appointmentStatusUpdateSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await updateAppointmentStatus({
      tenantId: tenant.id,
      appointmentId,
      status: validated.status as AppointmentStatus,
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
    console.error("[update-status-action] Error:", { tenantSlug, appointmentId });
    return { success: false, error: "Failed to update appointment status" };
  }
}
