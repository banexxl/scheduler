"use server";

/**
 * Manual reminder synchronization action — Milestone 6.13.
 *
 * Allows owners/admins to manually trigger reminder sync for an appointment.
 * Useful after creating new rules or for diagnostics.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { syncAppointmentReminders } from "../services/reminder-sync-service";
import type { ReminderSyncResult } from "../types/notification";

type ActionResult =
  | { success: true; data: ReminderSyncResult }
  | { success: false; error: string };

export async function syncAppointmentRemindersAction(
  tenantSlug: string,
  appointmentId: string
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    if (!appointmentId) {
      return { success: false, error: "Appointment ID is required." };
    }

    const result = await syncAppointmentReminders(tenant.id, appointmentId);

    if (result.status === "error") {
      return { success: false, error: result.reason };
    }

    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to sync reminders." };
  }
}
