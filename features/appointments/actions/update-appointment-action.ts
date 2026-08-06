"use server";

/**
 * Server action for updating appointment details — Milestone 6.9.
 *
 * Updates customer information and notes without changing time/status.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { appointmentEditSchema } from "../schemas/appointment-schemas";
import { updateAppointmentDetails } from "../services/update-appointment";
import type { Appointment } from "../types/appointment";

type ActionSuccess = { success: true; data: Appointment };
type ActionError = { success: false; error: string; code?: string };
type UpdateAppointmentActionResult = ActionSuccess | ActionError;

export async function updateAppointmentAction(
  tenantSlug: string,
  appointmentId: string,
  input: {
    customerName?: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    internalNotes?: string | null;
    customerNotes?: string | null;
  }
): Promise<UpdateAppointmentActionResult> {
  try {
    const { user, tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
    }

    const validated = await appointmentEditSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await updateAppointmentDetails({
      tenantId: tenant.id,
      appointmentId,
      customerName: validated.customerName,
      customerEmail: validated.customerEmail,
      customerPhone: validated.customerPhone,
      internalNotes: validated.internalNotes,
      customerNotes: validated.customerNotes,
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
    console.error("[update-appointment-action] Error:", { tenantSlug, appointmentId });
    return { success: false, error: "Failed to update appointment" };
  }
}
