import "server-only";

/**
 * Notification Enqueue Service — Milestone 6.12.
 *
 * Orchestrates enqueueing appointment notifications into the outbox.
 * Handles:
 * - Settings resolution (enabled/disabled checks)
 * - Template resolution and rendering (snapshot at enqueue time)
 * - Idempotency key generation
 * - Payload construction
 * - RPC call to the database enqueue function
 *
 * Does NOT call the email provider directly.
 * Does NOT block appointment mutations on failure.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNotificationSettings } from "./notification-settings-service";
import { resolveTemplate } from "./notification-template-service";
import {
  renderNotificationTemplate,
  buildTemplateVariables,
} from "./template-renderer";
import type {
  NotificationEventType,
  AppointmentNotificationPayload,
  EnqueueNotificationResult,
} from "../types/notification";
import type { Appointment } from "@/features/appointments/types/appointment";

// ─── Idempotency Key Generation ──────────────────────────────────────────────

/**
 * Generates a deterministic idempotency key for a notification event.
 *
 * For created: appointment:{id}:created
 * For cancelled: appointment:{id}:cancelled
 * For rescheduled: appointment:{id}:rescheduled:{updatedAt}
 */
function generateIdempotencyKey(
  appointmentId: string,
  eventType: NotificationEventType,
  eventIdentifier?: string
): string {
  const base = `appointment:${appointmentId}:${eventType.replace("appointment_", "")}`;
  if (eventType === "appointment_rescheduled" && eventIdentifier) {
    return `${base}:${eventIdentifier}`;
  }
  return base;
}

// ─── Build Payload from Appointment ──────────────────────────────────────────

function buildNotificationPayload(
  appointment: Appointment,
  tenantName: string,
  tenantTimeZone: string,
  options?: {
    previousStartsAt?: string;
    previousEndsAt?: string;
    cancellationReason?: string | null;
  }
): AppointmentNotificationPayload {
  return {
    appointmentId: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail ?? "",
    serviceName: appointment.serviceNameSnapshot,
    resourceName: appointment.resourceNameSnapshot,
    locationName: appointment.locationNameSnapshot,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    tenantTimeZone,
    price: appointment.price,
    currency: appointment.currency,
    tenantName,
    previousStartsAt: options?.previousStartsAt,
    previousEndsAt: options?.previousEndsAt,
    cancellationReason: options?.cancellationReason,
  };
}

// ─── Core Enqueue Function ───────────────────────────────────────────────────

export type EnqueueAppointmentNotificationInput = {
  tenantId: string;
  tenantName: string;
  tenantTimeZone: string;
  appointment: Appointment;
  eventType: NotificationEventType;
  previousStartsAt?: string;
  previousEndsAt?: string;
  cancellationReason?: string | null;
};

/**
 * Enqueues an appointment notification.
 *
 * Resolves settings, checks if the event type is enabled, resolves and
 * renders the template (snapshot policy), then calls the database RPC.
 *
 * Returns the enqueue result. Never throws — failures are safe and logged.
 */
export async function enqueueAppointmentNotification(
  input: EnqueueAppointmentNotificationInput
): Promise<EnqueueNotificationResult> {
  const {
    tenantId,
    tenantName,
    tenantTimeZone,
    appointment,
    eventType,
    previousStartsAt,
    previousEndsAt,
    cancellationReason,
  } = input;

  try {
    // 1. Verify customer email exists
    if (!appointment.customerEmail) {
      return { status: "skipped", reason: "no_customer_email" };
    }

    // 2. Resolve notification settings
    const settings = await resolveNotificationSettings(tenantId, tenantName);

    // 3. Check global email toggle
    if (!settings.emailNotificationsEnabled) {
      return { status: "skipped", reason: "email_notifications_disabled" };
    }

    // 4. Check specific event toggle
    switch (eventType) {
      case "appointment_created":
        if (!settings.sendBookingConfirmation) {
          return { status: "skipped", reason: "booking_confirmation_disabled" };
        }
        break;
      case "appointment_rescheduled":
        if (!settings.sendRescheduleConfirmation) {
          return { status: "skipped", reason: "reschedule_confirmation_disabled" };
        }
        break;
      case "appointment_cancelled":
        if (!settings.sendCancellationConfirmation) {
          return { status: "skipped", reason: "cancellation_confirmation_disabled" };
        }
        break;
    }

    // 5. Build payload
    const payload = buildNotificationPayload(appointment, tenantName, tenantTimeZone, {
      previousStartsAt,
      previousEndsAt,
      cancellationReason,
    });

    // 6. Generate idempotency key
    const eventIdentifier = eventType === "appointment_rescheduled"
      ? appointment.updatedAt
      : undefined;
    const idempotencyKey = generateIdempotencyKey(appointment.id, eventType, eventIdentifier);

    // 7. Resolve and render template (snapshot at enqueue time)
    const template = await resolveTemplate(tenantId, eventType);
    const templateValues = buildTemplateVariables(payload);
    const rendered = renderNotificationTemplate(
      template.subject,
      template.body,
      templateValues
    );

    // 8. Resolve sender identity
    const senderName = settings.senderName ?? tenantName;
    const replyToEmail = settings.replyToEmail ?? null;

    // 9. Call RPC via admin client (bypasses RLS)
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.rpc("enqueue_appointment_notification" as never, {
      p_tenant_id: tenantId,
      p_appointment_id: appointment.id,
      p_event_type: eventType,
      p_recipient_email: appointment.customerEmail,
      p_payload: payload as unknown as string,
      p_idempotency_key: idempotencyKey,
      p_rendered_subject: rendered.subject,
      p_rendered_html: rendered.html,
      p_rendered_text: rendered.text,
      p_sender_name: senderName,
      p_reply_to_email: replyToEmail,
    } as never);

    if (error) {
      console.error("[enqueue-notification] RPC error:", {
        tenantId,
        appointmentId: appointment.id,
        eventType,
        error: error.message,
      });
      return { status: "error", reason: error.message };
    }

    const result = data as unknown as { status: string; outbox_id?: string; reason?: string } | null;

    if (!result) {
      return { status: "error", reason: "no_rpc_response" };
    }

    if (result.status === "created") {
      return { status: "created", outboxId: result.outbox_id! };
    }

    if (result.status === "duplicate") {
      return { status: "duplicate", outboxId: result.outbox_id! };
    }

    return { status: "error", reason: result.reason ?? "unknown" };
  } catch (error) {
    // Never throw — appointment mutation should succeed regardless
    console.error("[enqueue-notification] Unexpected error:", {
      tenantId,
      appointmentId: appointment.id,
      eventType,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { status: "error", reason: "unexpected_error" };
  }
}

// ─── Convenience Functions for Specific Events ───────────────────────────────

/**
 * Enqueues a booking confirmation notification after appointment creation.
 */
export async function enqueueAppointmentCreatedNotification(
  tenantId: string,
  tenantName: string,
  tenantTimeZone: string,
  appointment: Appointment
): Promise<EnqueueNotificationResult> {
  return enqueueAppointmentNotification({
    tenantId,
    tenantName,
    tenantTimeZone,
    appointment,
    eventType: "appointment_created",
  });
}

/**
 * Enqueues a rescheduling notification after appointment time change.
 */
export async function enqueueAppointmentRescheduledNotification(
  tenantId: string,
  tenantName: string,
  tenantTimeZone: string,
  appointment: Appointment,
  previousStartsAt: string,
  previousEndsAt: string
): Promise<EnqueueNotificationResult> {
  return enqueueAppointmentNotification({
    tenantId,
    tenantName,
    tenantTimeZone,
    appointment,
    eventType: "appointment_rescheduled",
    previousStartsAt,
    previousEndsAt,
  });
}

/**
 * Enqueues a cancellation notification after appointment cancellation.
 */
export async function enqueueAppointmentCancelledNotification(
  tenantId: string,
  tenantName: string,
  tenantTimeZone: string,
  appointment: Appointment,
  cancellationReason?: string | null
): Promise<EnqueueNotificationResult> {
  return enqueueAppointmentNotification({
    tenantId,
    tenantName,
    tenantTimeZone,
    appointment,
    eventType: "appointment_cancelled",
    cancellationReason,
  });
}
