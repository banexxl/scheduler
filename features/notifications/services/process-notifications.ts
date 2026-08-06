import "server-only";

/**
 * Notification Processing Service — Milestone 6.12.
 *
 * Claims a batch of pending notifications from the outbox,
 * sends each via the configured email provider, and records
 * delivery results.
 *
 * Designed to be called by a protected route handler or cron job.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailProvider } from "./providers";
import { getEmailProviderName } from "./providers";
import type {
  NotificationOutboxEntry,
  ProcessBatchResult,
  ProcessNotificationResult,
  NotificationEventType,
  NotificationChannel,
  NotificationTemplateType,
  NotificationOutboxStatus,
  AppointmentNotificationPayload,
} from "../types/notification";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;

// ─── Row Mapper ──────────────────────────────────────────────────────────────

function mapOutboxRow(row: Record<string, unknown>): NotificationOutboxEntry {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    appointmentId: row.appointment_id as string,
    eventType: row.event_type as NotificationEventType,
    channel: row.channel as NotificationChannel,
    recipientEmail: row.recipient_email as string,
    templateType: row.template_type as NotificationTemplateType,
    payload: row.payload as AppointmentNotificationPayload,
    idempotencyKey: row.idempotency_key as string,
    status: row.status as NotificationOutboxStatus,
    attemptCount: row.attempt_count as number,
    nextAttemptAt: row.next_attempt_at as string,
    lockedAt: (row.locked_at as string) ?? null,
    lockedBy: (row.locked_by as string) ?? null,
    processedAt: (row.processed_at as string) ?? null,
    lastErrorCode: (row.last_error_code as string) ?? null,
    lastErrorMessage: (row.last_error_message as string) ?? null,
    renderedSubject: (row.rendered_subject as string) ?? null,
    renderedHtml: (row.rendered_html as string) ?? null,
    renderedText: (row.rendered_text as string) ?? null,
    senderName: (row.sender_name as string) ?? null,
    replyToEmail: (row.reply_to_email as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── Process Single Notification ─────────────────────────────────────────────

async function processOneNotification(
  entry: NotificationOutboxEntry,
  workerId: string
): Promise<ProcessNotificationResult> {
  const provider = getEmailProvider();
  const providerName = getEmailProviderName();
  const adminClient = createAdminClient();

  // Verify rendered content exists
  if (!entry.renderedSubject || !entry.renderedHtml || !entry.renderedText) {
    // Mark as permanent failure — missing rendered content
    await adminClient.rpc("mark_notification_failed" as never, {
      p_outbox_id: entry.id,
      p_worker_id: workerId,
      p_provider: providerName,
      p_error_code: "missing_rendered_content",
      p_error_message: "Notification is missing rendered subject, HTML, or text content",
      p_retryable: false,
    } as never);

    return {
      outboxId: entry.id,
      status: "failed",
      errorCode: "missing_rendered_content",
      safeMessage: "Missing rendered content",
    };
  }

  // Send via provider
  const fromName = entry.senderName ?? "Scheduler";
  const result = await provider.send({
    to: entry.recipientEmail,
    subject: entry.renderedSubject,
    html: entry.renderedHtml,
    text: entry.renderedText,
    fromName,
    replyTo: entry.replyToEmail,
    idempotencyKey: entry.idempotencyKey,
  });

  if (result.success) {
    // Mark as sent
    await adminClient.rpc("mark_notification_sent" as never, {
      p_outbox_id: entry.id,
      p_worker_id: workerId,
      p_provider: providerName,
      p_provider_message_id: result.providerMessageId ?? undefined,
    } as never);

    return {
      outboxId: entry.id,
      status: "sent",
      providerMessageId: result.providerMessageId,
    };
  }

  // Mark as failed (retryable or terminal)
  await adminClient.rpc("mark_notification_failed" as never, {
    p_outbox_id: entry.id,
    p_worker_id: workerId,
    p_provider: providerName,
    p_error_code: result.errorCode,
    p_error_message: result.safeMessage,
    p_retryable: result.retryable,
  } as never);

  return {
    outboxId: entry.id,
    status: result.retryable ? "retrying" : "failed",
    errorCode: result.errorCode,
    safeMessage: result.safeMessage,
  };
}

// ─── Process Batch ───────────────────────────────────────────────────────────

/**
 * Claims and processes a batch of pending notifications.
 *
 * @param batchSize Number of notifications to claim (default 10, max 50)
 * @returns Aggregate processing results
 */
export async function processNotificationBatch(
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<ProcessBatchResult> {
  const effectiveBatchSize = Math.min(Math.max(1, batchSize), MAX_BATCH_SIZE);
  const workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const adminClient = createAdminClient();

  // Claim batch via RPC
  const { data, error } = await adminClient.rpc("claim_notification_outbox_batch" as never, {
    p_worker_id: workerId,
    p_batch_size: effectiveBatchSize,
  } as never);

  if (error) {
    console.error("[process-notifications] Claim error:", error.message);
    return { processed: 0, sent: 0, failed: 0, retrying: 0, results: [] };
  }

  const rows = (data as Record<string, unknown>[] | null) ?? [];
  if (rows.length === 0) {
    return { processed: 0, sent: 0, failed: 0, retrying: 0, results: [] };
  }

  const entries = rows.map(mapOutboxRow);

  // Process each notification sequentially to respect provider rate limits
  const results: ProcessNotificationResult[] = [];
  let sent = 0;
  let failed = 0;
  let retrying = 0;

  for (const entry of entries) {
    try {
      const result = await processOneNotification(entry, workerId);
      results.push(result);

      if (result.status === "sent") sent++;
      else if (result.status === "failed") failed++;
      else if (result.status === "retrying") retrying++;
    } catch (error) {
      // Unexpected error processing individual notification
      console.error("[process-notifications] Unexpected error:", {
        outboxId: entry.id,
        error: error instanceof Error ? error.message : "unknown",
      });

      // Attempt to mark as failed
      try {
        await adminClient.rpc("mark_notification_failed" as never, {
          p_outbox_id: entry.id,
          p_worker_id: workerId,
          p_provider: getEmailProviderName(),
          p_error_code: "processing_error",
          p_error_message: "Unexpected error during processing",
          p_retryable: true,
        } as never);
      } catch {
        // If this also fails, the stale lock recovery will handle it
      }

      results.push({
        outboxId: entry.id,
        status: "retrying",
        errorCode: "processing_error",
        safeMessage: "Unexpected error during processing",
      });
      retrying++;
    }
  }

  console.log("[process-notifications] Batch complete:", {
    workerId,
    processed: entries.length,
    sent,
    failed,
    retrying,
  });

  return {
    processed: entries.length,
    sent,
    failed,
    retrying,
    results,
  };
}
