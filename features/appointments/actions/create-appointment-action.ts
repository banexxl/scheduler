"use server";

/**
 * Server action for creating an appointment — Milestone 6.9.
 * Notification integration added in Milestone 6.12.
 *
 * Authenticates the user, verifies tenant membership (owner/admin),
 * validates input, delegates to the creation service, and enqueues
 * a booking confirmation notification on success.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { appointmentCreateSchema } from "../schemas/appointment-schemas";
import { createAppointment } from "../services/create-appointment";
import { enqueueAppointmentCreatedNotification } from "@/features/notifications/services/enqueue-notification";
import { syncRemindersAfterCreation } from "@/features/notifications/services/reminder-sync-service";
import { loadTenantTimezone } from "@/features/availability/services/availability-queries";
import type { Appointment } from "../types/appointment";

// ─── Action Types ────────────────────────────────────────────────────────────

type ActionSuccess = { success: true; data: Appointment };
type ActionError = { success: false; error: string; code?: string };
type CreateAppointmentActionResult = ActionSuccess | ActionError;

// ─── Action ──────────────────────────────────────────────────────────────────

export async function createAppointmentAction(
  tenantSlug: string,
  input: {
    serviceId: string;
    locationId: string;
    resourceId: string;
    customerId?: string | null;
    customerName: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    localDate: string;
    localStartTime: string;
    status?: string;
    source?: string;
    internalNotes?: string | null;
    customerNotes?: string | null;
  }
): Promise<CreateAppointmentActionResult> {
  try {
    // 1. Authenticate and verify tenant membership (owner/admin)
    const { user, tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
    }

    // 2. Validate input
    const validated = await appointmentCreateSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });

    // 3. Create appointment
    const result = await createAppointment({
      tenantId: tenant.id,
      serviceId: validated.serviceId,
      locationId: validated.locationId,
      resourceId: validated.resourceId,
      customerId: validated.customerId ?? null,
      customerName: validated.customerName,
      customerEmail: validated.customerEmail ?? null,
      customerPhone: validated.customerPhone ?? null,
      localDate: validated.localDate,
      localStartTime: validated.localStartTime,
      status: validated.status as Appointment["status"],
      source: validated.source as Appointment["source"],
      internalNotes: validated.internalNotes ?? null,
      customerNotes: validated.customerNotes ?? null,
      createdBy: user.id,
    });

    if (!result.success) {
      return { success: false, error: result.error, code: result.code };
    }

    // Enqueue booking confirmation notification (non-blocking)
    try {
      const tenantTz = await loadTenantTimezone(tenant.id);
      const timeZone = tenantTz?.defaultTimezone ?? "UTC";
      await enqueueAppointmentCreatedNotification(
        tenant.id,
        tenant.name,
        timeZone,
        result.appointment
      );
    } catch {
      // Notification failure must never block appointment creation
    }

    // Sync reminder schedules (non-blocking)
    try {
      await syncRemindersAfterCreation(tenant.id, tenant.name, result.appointment);
    } catch {
      // Reminder sync failure must never block appointment creation
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
    console.error("[create-appointment-action] Error:", { tenantSlug });
    return { success: false, error: "Failed to create appointment" };
  }
}
