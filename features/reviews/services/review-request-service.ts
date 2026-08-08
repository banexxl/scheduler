import "server-only";

/**
 * Review Request Service — Milestone 8.7.
 *
 * Triggers review invitation emails after appointment completion.
 * Uses the existing notification outbox with delayed scheduling.
 *
 * Flow:
 *   Appointment completed → createReviewToken → enqueue review request email
 *
 * Non-blocking: completion must not fail if review request fails.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createReviewToken } from "./review-token-service";
import { resolveNotificationSettings } from "@/features/notifications/services/notification-settings-service";
import { formatInTimeZone } from "date-fns-tz";
import type { Appointment } from "@/features/appointments/types/appointment";

// ─── Default Template ────────────────────────────────────────────────────────

const DEFAULT_SUBJECT = "How was your appointment with {{tenant_name}}?";

const DEFAULT_BODY = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2>We'd love your feedback</h2>
<p>Hi {{customer_name}},</p>
<p>Thank you for visiting <strong>{{tenant_name}}</strong>. We hope you enjoyed your <strong>{{service_name}}</strong> appointment on {{appointment_date}}.</p>
<p>Your feedback helps us improve. It only takes a moment:</p>
<p style="margin: 24px 0;">
  <a href="{{review_url}}" style="background-color: #1976d2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
    Leave a Review
  </a>
</p>
<p style="color: #666; font-size: 13px;">This link is personal and expires in 30 days.</p>
</div>`;

// ─── Render Email ────────────────────────────────────────────────────────────

function renderReviewRequestEmail(
  tenantName: string,
  customerName: string,
  serviceName: string,
  appointmentDate: string,
  reviewUrl: string
): { subject: string; html: string; text: string } {
  const values: Record<string, string> = {
    tenant_name: tenantName,
    customer_name: customerName,
    service_name: serviceName,
    appointment_date: appointmentDate,
    review_url: reviewUrl,
  };

  const subject = DEFAULT_SUBJECT.replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] ?? "");

  const html = DEFAULT_BODY.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = values[k] ?? "";
    if (k === "review_url") return v;
    return v.replace(/[&<>"']/g, (c: string) => {
      const m: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return m[c] ?? c;
    });
  });

  const text = `How was your appointment with ${tenantName}?\n\nHi ${customerName},\n\nThank you for your ${serviceName} appointment on ${appointmentDate}.\n\nWe'd love your feedback: ${reviewUrl}\n\nThis link expires in 30 days.`;

  return { subject, html, text };
}

// ─── Trigger Review Request ──────────────────────────────────────────────────

/**
 * Triggers a review request after appointment completion.
 * Called as a non-blocking side effect from the status transition action.
 *
 * Checks:
 * - review_requests_enabled setting
 * - customer email exists
 * - appointment is completed
 *
 * Creates token + enqueues email with configured delay.
 */
export async function triggerReviewRequest(
  tenantId: string,
  tenantName: string,
  tenantTimeZone: string,
  appointment: Appointment
): Promise<void> {
  try {
    if (appointment.status !== "completed") return;
    if (!appointment.customerEmail) return;

    // Check review settings
    const settings = await resolveNotificationSettings(tenantId, tenantName);
    if (!settings.emailNotificationsEnabled) return;

    // Load review-specific settings
    const supabase = createAdminClient();
    const { data: notifSettings } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_notification_settings" as never)
      .select("review_requests_enabled, review_request_delay_minutes" as never)
      .eq("tenant_id" as never, tenantId)
      .single();

    const reviewEnabled = (notifSettings as unknown as { review_requests_enabled?: boolean })?.review_requests_enabled ?? false;
    if (!reviewEnabled) return;

    const delayMinutes = (notifSettings as unknown as { review_request_delay_minutes?: number })?.review_request_delay_minutes ?? 60;

    // Create review token
    const tokenResult = await createReviewToken(tenantId, appointment.id);
    if (!tokenResult) return;

    // Build review URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    // Need tenant slug — load it
    const { data: tenantRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenants" as never)
      .select("slug" as never)
      .eq("id" as never, tenantId)
      .single();

    if (!tenantRow) return;
    const tenantSlug = (tenantRow as unknown as { slug: string }).slug;
    const reviewUrl = `${appUrl}/book/${tenantSlug}/review/${tokenResult.rawToken}`;

    // Format appointment date
    const appointmentDate = formatInTimeZone(appointment.startsAt, tenantTimeZone, "MMMM d, yyyy");

    // Render email
    const rendered = renderReviewRequestEmail(
      tenantName,
      appointment.customerName,
      appointment.serviceNameSnapshot,
      appointmentDate,
      reviewUrl
    );

    const senderName = settings.senderName ?? tenantName;
    const replyToEmail = settings.replyToEmail ?? null;

    // Calculate next_attempt_at with delay
    const nextAttemptAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();

    // Idempotency key
    const idempotencyKey = `appointment:${appointment.id}:review-request`;

    // Enqueue via outbox
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("notification_outbox" as never)
      .upsert({
        tenant_id: tenantId,
        appointment_id: appointment.id,
        event_type: "appointment_review_request",
        channel: "email",
        recipient_email: appointment.customerEmail,
        template_type: "appointment_review_request",
        payload: { tenantName, serviceName: appointment.serviceNameSnapshot, appointmentDate, reviewUrl },
        idempotency_key: idempotencyKey,
        status: "pending",
        next_attempt_at: nextAttemptAt,
        rendered_subject: rendered.subject,
        rendered_html: rendered.html,
        rendered_text: rendered.text,
        sender_name: senderName,
        reply_to_email: replyToEmail,
      } as never, { onConflict: "tenant_id,idempotency_key" } as never);
  } catch (error) {
    // Non-blocking: never fail the completion
    console.error("[review-request] Error:", {
      tenantId,
      appointmentId: appointment.id,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
