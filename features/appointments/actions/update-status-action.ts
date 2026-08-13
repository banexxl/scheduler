"use server";

/**
 * Server action for updating appointment status — Milestone 6.9.
 * Reminder integration added in Milestone 8.3.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { appointmentStatusUpdateSchema } from "../schemas/appointment-schemas";
import { updateAppointmentStatus } from "../services/update-appointment";
import { syncRemindersAfterStatusChange } from "@/features/notifications/services/reminder-sync-service";
import { attemptReferralQualification } from "@/features/referrals/services/qualify-referral";
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

    // Cancel pending reminders when appointment becomes ineligible (non-blocking)
    try {
      await syncRemindersAfterStatusChange(tenant.id, result.appointment);
    } catch {
      // Reminder sync failure must never block status transitions
    }

    // Referral qualification on completion (non-blocking)
    if (result.appointment.status === "completed") {
      try {
        await attemptReferralQualification(
          tenant.id,
          result.appointment.id,
          result.appointment.customerEmail
        );
      } catch {
        // Referral failure must never block appointment completion
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
    console.error("[update-status-action] Error:", { tenantSlug, appointmentId });
    return { success: false, error: "Failed to update appointment status" };
  }
}
