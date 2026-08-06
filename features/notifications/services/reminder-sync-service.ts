import "server-only";

/**
 * Reminder Synchronization Service — Milestone 6.13.
 *
 * Orchestrates reminder synchronization after appointment mutations.
 * Calls the database RPC and integrates with the existing notification settings.
 *
 * Integration points:
 * - After appointment creation
 * - After appointment rescheduling
 * - After appointment cancellation
 * - After appointment status transitions
 * - Manual sync action
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNotificationSettings } from "./notification-settings-service";
import type { Appointment } from "@/features/appointments/types/appointment";
import type { ReminderSyncResult } from "../types/notification";

// ─── Sync Appointment Reminders ──────────────────────────────────────────────

/**
 * Synchronizes reminder schedules for an appointment.
 * Calls the database RPC which handles create/update/cancel atomically.
 *
 * Never throws — appointment mutations must succeed regardless.
 */
export async function syncAppointmentReminders(
  tenantId: string,
  appointmentId: string
): Promise<ReminderSyncResult> {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.rpc("sync_appointment_reminders" as never, {
      p_tenant_id: tenantId,
      p_appointment_id: appointmentId,
    } as never);

    if (error) {
      console.error("[reminder-sync] RPC error:", {
        tenantId,
        appointmentId,
        error: error.message,
      });
      return { status: "error", reason: error.message };
    }

    const result = data as unknown as Record<string, unknown> | null;
    if (!result) {
      return { status: "error", reason: "no_rpc_response" };
    }

    switch (result.status) {
      case "synced":
        return {
          status: "synced",
          createdOrUpdated: (result.created_or_updated as number) ?? 0,
          cancelled: (result.cancelled as number) ?? 0,
          skippedPast: (result.skipped_past as number) ?? 0,
          scheduleVersion: (result.schedule_version as number) ?? 1,
        };
      case "ineligible":
        return {
          status: "ineligible",
          cancelled: (result.cancelled as number) ?? 0,
        };
      case "skipped":
        return {
          status: "skipped",
          reason: (result.reason as string) ?? "unknown",
        };
      default:
        return {
          status: "error",
          reason: (result.reason as string) ?? "unknown_status",
        };
    }
  } catch (error) {
    console.error("[reminder-sync] Unexpected error:", {
      tenantId,
      appointmentId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { status: "error", reason: "unexpected_error" };
  }
}

// ─── Cancel Appointment Reminders ────────────────────────────────────────────

/**
 * Cancels all pending reminders and their linked outbox rows for an appointment.
 * Used during cancellation, terminal status transitions, and rescheduling.
 *
 * Never throws.
 */
export async function cancelAppointmentReminders(
  tenantId: string,
  appointmentId: string,
  reason: string = "appointment_changed"
): Promise<number> {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.rpc(
      "cancel_pending_appointment_reminder_notifications" as never,
      {
        p_tenant_id: tenantId,
        p_appointment_id: appointmentId,
        p_reason: reason,
      } as never
    );

    if (error) {
      console.error("[reminder-cancel] RPC error:", {
        tenantId,
        appointmentId,
        error: error.message,
      });
      return 0;
    }

    return (data as unknown as number) ?? 0;
  } catch {
    return 0;
  }
}

// ─── Integration: After Appointment Creation ─────────────────────────────────

/**
 * Called after successful appointment creation.
 * Checks if email notifications are enabled before syncing reminders.
 *
 * Non-blocking: appointment creation must succeed regardless.
 */
export async function syncRemindersAfterCreation(
  tenantId: string,
  tenantName: string,
  appointment: Appointment
): Promise<ReminderSyncResult> {
  // Skip if no customer email
  if (!appointment.customerEmail) {
    return { status: "skipped", reason: "no_customer_email" };
  }

  // Check notification settings
  const settings = await resolveNotificationSettings(tenantId, tenantName);
  if (!settings.emailNotificationsEnabled) {
    return { status: "skipped", reason: "email_notifications_disabled" };
  }

  return syncAppointmentReminders(tenantId, appointment.id);
}

// ─── Integration: After Rescheduling ─────────────────────────────────────────

/**
 * Called after successful rescheduling.
 * Cancels stale reminders and creates new ones for the updated schedule.
 *
 * Non-blocking: rescheduling must succeed regardless.
 */
export async function syncRemindersAfterReschedule(
  tenantId: string,
  tenantName: string,
  appointment: Appointment
): Promise<ReminderSyncResult> {
  if (!appointment.customerEmail) {
    return { status: "skipped", reason: "no_customer_email" };
  }

  const settings = await resolveNotificationSettings(tenantId, tenantName);
  if (!settings.emailNotificationsEnabled) {
    return { status: "skipped", reason: "email_notifications_disabled" };
  }

  // The sync RPC handles version-based cancellation of old reminders
  // and creation of new ones for the current schedule_version
  return syncAppointmentReminders(tenantId, appointment.id);
}

// ─── Integration: After Cancellation ─────────────────────────────────────────

/**
 * Called after successful appointment cancellation.
 * Cancels all pending reminder schedules and linked outbox rows.
 *
 * Non-blocking.
 */
export async function cancelRemindersAfterCancellation(
  tenantId: string,
  appointmentId: string
): Promise<void> {
  await cancelAppointmentReminders(tenantId, appointmentId, "appointment_cancelled");
}

// ─── Integration: After Status Change ────────────────────────────────────────

/**
 * Called after a status transition makes an appointment ineligible for reminders.
 * Eligible statuses: pending, confirmed.
 *
 * Non-blocking.
 */
export async function syncRemindersAfterStatusChange(
  tenantId: string,
  appointment: Appointment
): Promise<void> {
  const eligible = ["pending", "confirmed"];
  if (!eligible.includes(appointment.status)) {
    await cancelAppointmentReminders(tenantId, appointment.id, "appointment_ineligible");
  }
}
