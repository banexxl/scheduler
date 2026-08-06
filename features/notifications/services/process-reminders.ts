import "server-only";

/**
 * Reminder Processing Service — Milestone 6.13.
 *
 * Claims due reminders and enqueues them into the notification outbox.
 * Separate from notification processing: this service converts reminder
 * schedules into outbox records. The notification processor handles SMTP.
 *
 * Pipeline:
 *   appointment_reminders (pending, due) → notification_outbox → SMTP
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNotificationSettings } from "./notification-settings-service";
import { resolveTemplate } from "./notification-template-service";
import {
  renderNotificationTemplate,
  buildTemplateVariables,
} from "./template-renderer";
import type {
  AppointmentNotificationPayload,
  AppointmentReminder,
  ProcessReminderResult,
  ProcessReminderBatchResult,
  ReminderStatus,
  NotificationChannel,
} from "../types/notification";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_BATCH_SIZE = 50;

// ─── Row Mapper ──────────────────────────────────────────────────────────────

function mapReminderRow(row: Record<string, unknown>): AppointmentReminder {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    appointmentId: row.appointment_id as string,
    reminderRuleId: row.reminder_rule_id as string,
    scheduleVersion: row.schedule_version as number,
    channel: row.channel as NotificationChannel,
    scheduledFor: row.scheduled_for as string,
    status: row.status as ReminderStatus,
    outboxId: (row.outbox_id as string) ?? null,
    claimedAt: (row.claimed_at as string) ?? null,
    claimedBy: (row.claimed_by as string) ?? null,
    enqueuedAt: (row.enqueued_at as string) ?? null,
    sentAt: (row.sent_at as string) ?? null,
    cancelledAt: (row.cancelled_at as string) ?? null,
    cancellationReason: (row.cancellation_reason as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── Process Single Reminder ─────────────────────────────────────────────────

async function processOneReminder(
  reminder: AppointmentReminder,
  workerId: string
): Promise<ProcessReminderResult> {
  const adminClient = createAdminClient();

  // 1. Load appointment data for the payload
  const { data: apptData } = await adminClient
    .from("appointments" as never)
    .select("*")
    .eq("id" as never, reminder.appointmentId)
    .eq("tenant_id" as never, reminder.tenantId)
    .single();

  if (!apptData) {
    await releaseReminder(adminClient, reminder.id, workerId, "appointment_not_found");
    return { reminderId: reminder.id, status: "skipped", reason: "appointment_not_found" };
  }

  const appt = apptData as unknown as Record<string, unknown>;

  // 2. Verify schedule version still matches
  if ((appt.schedule_version as number) !== reminder.scheduleVersion) {
    await releaseReminder(adminClient, reminder.id, workerId, "schedule_version_mismatch");
    return { reminderId: reminder.id, status: "skipped", reason: "schedule_version_mismatch" };
  }

  // 3. Verify appointment is still eligible
  const eligibleStatuses = ["pending", "confirmed"];
  if (!eligibleStatuses.includes(appt.status as string)) {
    await cancelReminder(adminClient, reminder.id, "appointment_ineligible");
    return { reminderId: reminder.id, status: "skipped", reason: "appointment_ineligible" };
  }

  // 4. Verify customer email exists
  const customerEmail = appt.customer_email as string | null;
  if (!customerEmail) {
    await releaseReminder(adminClient, reminder.id, workerId, "no_customer_email");
    return { reminderId: reminder.id, status: "skipped", reason: "no_customer_email" };
  }

  // 5. Verify appointment start is still in the future
  if (new Date(appt.starts_at as string) <= new Date()) {
    await cancelReminder(adminClient, reminder.id, "appointment_in_past");
    return { reminderId: reminder.id, status: "skipped", reason: "appointment_in_past" };
  }

  // 6. Load tenant for name and timezone
  const { data: tenantData } = await adminClient
    .from("tenants" as never)
    .select("id, name, default_timezone" as never)
    .eq("id" as never, reminder.tenantId)
    .single();

  if (!tenantData) {
    await releaseReminder(adminClient, reminder.id, workerId, "tenant_not_found");
    return { reminderId: reminder.id, status: "skipped", reason: "tenant_not_found" };
  }

  const tenant = tenantData as unknown as { id: string; name: string; default_timezone: string };

  // 7. Check notification settings
  const settings = await resolveNotificationSettings(reminder.tenantId, tenant.name);
  if (!settings.emailNotificationsEnabled) {
    await releaseReminder(adminClient, reminder.id, workerId, "notifications_disabled");
    return { reminderId: reminder.id, status: "skipped", reason: "notifications_disabled" };
  }

  // 8. Load reminder rule for offset
  const { data: ruleData } = await adminClient
    .from("tenant_reminder_rules" as never)
    .select("offset_minutes" as never)
    .eq("id" as never, reminder.reminderRuleId)
    .single();

  const offsetMinutes = ruleData
    ? (ruleData as unknown as Record<string, unknown>).offset_minutes as number
    : 0;

  // 9. Build payload
  const payload: AppointmentNotificationPayload = {
    appointmentId: appt.id as string,
    appointmentNumber: appt.appointment_number as string,
    customerName: appt.customer_name as string,
    customerEmail,
    serviceName: appt.service_name_snapshot as string,
    resourceName: appt.resource_name_snapshot as string,
    locationName: appt.location_name_snapshot as string,
    startsAt: appt.starts_at as string,
    endsAt: appt.ends_at as string,
    tenantTimeZone: tenant.default_timezone,
    price: String(appt.price),
    currency: appt.currency as string,
    tenantName: tenant.name,
    reminderOffsetMinutes: offsetMinutes,
  };

  // 10. Resolve and render template
  const template = await resolveTemplate(reminder.tenantId, "appointment_reminder");
  const templateValues = buildTemplateVariables(payload);
  const rendered = renderNotificationTemplate(
    template.subject,
    template.body,
    templateValues
  );

  // 11. Resolve sender identity
  const senderName = settings.senderName ?? tenant.name;
  const replyToEmail = settings.replyToEmail ?? null;

  // 12. Generate deterministic idempotency key
  const idempotencyKey = `appointment:${reminder.appointmentId}:reminder:${reminder.reminderRuleId}:v${reminder.scheduleVersion}`;

  // 13. Enqueue into notification outbox
  const { data: enqueueData, error: enqueueError } = await adminClient.rpc(
    "enqueue_appointment_notification" as never,
    {
      p_tenant_id: reminder.tenantId,
      p_appointment_id: reminder.appointmentId,
      p_event_type: "appointment_reminder",
      p_recipient_email: customerEmail,
      p_payload: payload as unknown as string,
      p_idempotency_key: idempotencyKey,
      p_rendered_subject: rendered.subject,
      p_rendered_html: rendered.html,
      p_rendered_text: rendered.text,
      p_sender_name: senderName,
      p_reply_to_email: replyToEmail,
    } as never
  );

  if (enqueueError) {
    console.error("[process-reminders] Enqueue error:", {
      reminderId: reminder.id,
      error: enqueueError.message,
    });
    // Release back to pending for retry
    await releaseReminder(adminClient, reminder.id, workerId, "enqueue_failed");
    return { reminderId: reminder.id, status: "failed", reason: "enqueue_failed" };
  }

  const enqueueResult = enqueueData as unknown as { status: string; outbox_id?: string } | null;
  const outboxId = enqueueResult?.outbox_id ?? null;

  // 14. Mark reminder as enqueued
  await adminClient
    .from("appointment_reminders" as never)
    .update({
      status: "enqueued",
      outbox_id: outboxId,
      enqueued_at: new Date().toISOString(),
      claimed_at: null,
      claimed_by: null,
    } as never)
    .eq("id" as never, reminder.id);

  return {
    reminderId: reminder.id,
    status: "enqueued",
    outboxId: outboxId ?? undefined,
  };
}

// ─── Helper: Release reminder back to pending ────────────────────────────────

async function releaseReminder(
  adminClient: ReturnType<typeof createAdminClient>,
  reminderId: string,
  _workerId: string,
  reason: string
): Promise<void> {
  console.log("[process-reminders] Releasing reminder:", { reminderId, reason });
  await adminClient
    .from("appointment_reminders" as never)
    .update({
      status: "pending",
      claimed_at: null,
      claimed_by: null,
    } as never)
    .eq("id" as never, reminderId);
}

// ─── Helper: Cancel reminder ─────────────────────────────────────────────────

async function cancelReminder(
  adminClient: ReturnType<typeof createAdminClient>,
  reminderId: string,
  reason: string
): Promise<void> {
  await adminClient
    .from("appointment_reminders" as never)
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      claimed_at: null,
      claimed_by: null,
    } as never)
    .eq("id" as never, reminderId);
}

// ─── Process Batch ───────────────────────────────────────────────────────────

/**
 * Claims and processes a batch of due reminders.
 * Converts them into notification outbox records.
 */
export async function processReminderBatch(
  batchSize: number = 10
): Promise<ProcessReminderBatchResult> {
  const effectiveBatchSize = Math.min(Math.max(1, batchSize), MAX_BATCH_SIZE);
  const workerId = `reminder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const adminClient = createAdminClient();

  // Claim due reminders via RPC
  const { data, error } = await adminClient.rpc("claim_due_appointment_reminders" as never, {
    p_worker_id: workerId,
    p_batch_size: effectiveBatchSize,
  } as never);

  if (error) {
    console.error("[process-reminders] Claim error:", error.message);
    return { processed: 0, enqueued: 0, skipped: 0, failed: 0, results: [] };
  }

  const rows = (data as unknown as Record<string, unknown>[] | null) ?? [];
  if (rows.length === 0) {
    return { processed: 0, enqueued: 0, skipped: 0, failed: 0, results: [] };
  }

  const reminders = rows.map(mapReminderRow);

  // Process each reminder sequentially
  const results: ProcessReminderResult[] = [];
  let enqueued = 0;
  let skipped = 0;
  let failed = 0;

  for (const reminder of reminders) {
    try {
      const result = await processOneReminder(reminder, workerId);
      results.push(result);

      if (result.status === "enqueued") enqueued++;
      else if (result.status === "skipped") skipped++;
      else if (result.status === "failed") failed++;
    } catch (error) {
      console.error("[process-reminders] Unexpected error:", {
        reminderId: reminder.id,
        error: error instanceof Error ? error.message : "unknown",
      });

      // Release back to pending
      try {
        await releaseReminder(adminClient, reminder.id, workerId, "processing_error");
      } catch {
        // Stale lock recovery will handle this
      }

      results.push({
        reminderId: reminder.id,
        status: "failed",
        reason: "processing_error",
      });
      failed++;
    }
  }

  console.log("[process-reminders] Batch complete:", {
    workerId,
    processed: reminders.length,
    enqueued,
    skipped,
    failed,
  });

  return {
    processed: reminders.length,
    enqueued,
    skipped,
    failed,
    results,
  };
}
