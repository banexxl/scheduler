import "server-only";

/**
 * Notification Outbox Service — Milestone 6.12.
 *
 * Provides queries for notification outbox records and delivery attempts.
 * All queries are tenant-scoped.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  NotificationOutboxEntry,
  NotificationOutboxListItem,
  NotificationOutboxStatus,
  NotificationDelivery,
  NotificationEventType,
  NotificationChannel,
  NotificationTemplateType,
  AppointmentNotificationPayload,
} from "../types/notification";

// ─── Row Mappers ─────────────────────────────────────────────────────────────

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

function mapOutboxListItem(row: Record<string, unknown>): NotificationOutboxListItem {
  return {
    id: row.id as string,
    eventType: row.event_type as NotificationEventType,
    recipientEmail: row.recipient_email as string,
    status: row.status as NotificationOutboxStatus,
    attemptCount: row.attempt_count as number,
    lastErrorMessage: (row.last_error_message as string) ?? null,
    processedAt: (row.processed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapDeliveryRow(row: Record<string, unknown>): NotificationDelivery {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    outboxId: row.outbox_id as string,
    provider: row.provider as string,
    providerMessageId: (row.provider_message_id as string) ?? null,
    attemptNumber: row.attempt_number as number,
    status: row.status as NotificationDelivery["status"],
    errorCode: (row.error_code as string) ?? null,
    errorMessage: (row.error_message as string) ?? null,
    responseMetadata: (row.response_metadata as Record<string, unknown>) ?? null,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

// ─── Get Outbox Entry by ID ──────────────────────────────────────────────────

/**
 * Loads a single outbox entry with all details.
 */
export async function getNotificationById(
  tenantId: string,
  outboxId: string
): Promise<NotificationOutboxEntry | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("notification_outbox" as never)
    .select("*")
    .eq("tenant_id" as never, tenantId)
    .eq("id" as never, outboxId)
    .single();

  if (!data) return null;
  return mapOutboxRow(data as Record<string, unknown>);
}

// ─── Get Outbox Entries for Appointment ──────────────────────────────────────

/**
 * Loads all notification outbox entries for a specific appointment.
 */
export async function getNotificationsForAppointment(
  tenantId: string,
  appointmentId: string
): Promise<NotificationOutboxListItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("notification_outbox" as never)
    .select("id, event_type, recipient_email, status, attempt_count, last_error_message, processed_at, created_at" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("appointment_id" as never, appointmentId)
    .order("created_at" as never, { ascending: false });

  if (!data) return [];
  return (data as unknown as Record<string, unknown>[]).map(mapOutboxListItem);
}

// ─── Get Recent Failures ─────────────────────────────────────────────────────

/**
 * Loads recent failed notification entries for a tenant.
 */
export async function getRecentFailures(
  tenantId: string,
  limit = 20
): Promise<NotificationOutboxListItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("notification_outbox" as never)
    .select("id, event_type, recipient_email, status, attempt_count, last_error_message, processed_at, created_at" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("status" as never, "failed")
    .order("created_at" as never, { ascending: false })
    .limit(limit);

  if (!data) return [];
  return (data as unknown as Record<string, unknown>[]).map(mapOutboxListItem);
}

// ─── Get Delivery Attempts for Outbox Entry ──────────────────────────────────

/**
 * Loads all delivery attempts for a given outbox entry.
 */
export async function getDeliveryAttempts(
  tenantId: string,
  outboxId: string
): Promise<NotificationDelivery[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("notification_deliveries" as never)
    .select("*")
    .eq("tenant_id" as never, tenantId)
    .eq("outbox_id" as never, outboxId)
    .order("attempt_number" as never, { ascending: true });

  if (!data) return [];
  return (data as Record<string, unknown>[]).map(mapDeliveryRow);
}

// ─── Count Pending and Failed ────────────────────────────────────────────────

export type NotificationCounts = {
  pending: number;
  failed: number;
};

/**
 * Counts pending and failed notification entries for a tenant.
 */
export async function getNotificationCounts(
  tenantId: string
): Promise<NotificationCounts> {
  const supabase = await createClient();

  const [pendingResult, failedResult] = await Promise.all([
    supabase
      .from("notification_outbox" as never)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id" as never, tenantId)
      .eq("status" as never, "pending"),
    supabase
      .from("notification_outbox" as never)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id" as never, tenantId)
      .eq("status" as never, "failed"),
  ]);

  return {
    pending: pendingResult.count ?? 0,
    failed: failedResult.count ?? 0,
  };
}

// ─── Mask Email for Display ──────────────────────────────────────────────────

/**
 * Partially masks an email address for display in lists.
 * Example: j***@example.com
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}
