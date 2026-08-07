import "server-only";

/**
 * Portal Email Service — Milestone 8.6.
 *
 * Enqueues the customer portal access email using the existing
 * notification outbox infrastructure.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNotificationSettings } from "@/features/notifications/services/notification-settings-service";
import {
  renderNotificationTemplate,
} from "@/features/notifications/services/template-renderer";
import type { RenderedTemplate } from "@/features/notifications/types/notification";

// ─── Default Template ────────────────────────────────────────────────────────

const DEFAULT_SUBJECT = "Your appointment access link — {{tenant_name}}";

const DEFAULT_BODY = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Access Your Appointments</h2>
<p>Hi,</p>
<p>You requested access to your appointments with <strong>{{tenant_name}}</strong>.</p>
<p>Click the link below to view and manage your appointments:</p>
<p style="margin: 24px 0;">
  <a href="{{portal_access_url}}" style="background-color: #1976d2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
    View My Appointments
  </a>
</p>
<p style="color: #666; font-size: 13px;">This link expires in {{expires_in}}. For security, it can only be used once.</p>
<p style="color: #666; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
</div>`;

// ─── Render ──────────────────────────────────────────────────────────────────

function renderPortalAccessEmail(
  tenantName: string,
  portalAccessUrl: string,
  expiresInMinutes: number
): RenderedTemplate {
  const expiresIn = expiresInMinutes >= 60
    ? `${Math.round(expiresInMinutes / 60)} hour${expiresInMinutes >= 120 ? "s" : ""}`
    : `${expiresInMinutes} minutes`;

  const values = {
    tenant_name: tenantName,
    portal_access_url: portalAccessUrl,
    expires_in: expiresIn,
  };

  // Simple variable substitution (not using the full template renderer
  // since portal_access_url is not in SUPPORTED_TEMPLATE_VARIABLES)
  const subject = DEFAULT_SUBJECT.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key as keyof typeof values] ?? "");

  const html = DEFAULT_BODY.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = values[key as keyof typeof values] ?? "";
    // Don't HTML-escape the URL (it's in an href attribute)
    if (key === "portal_access_url") return val;
    return val.replace(/[&<>"']/g, (c: string) => {
      const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[c] ?? c;
    });
  });

  const text = `Access your appointments with ${tenantName}\n\nClick here: ${portalAccessUrl}\n\nThis link expires in ${expiresIn}. It can only be used once.\n\nIf you did not request this, you can safely ignore this email.`;

  return { subject, html, text };
}

// ─── Enqueue ─────────────────────────────────────────────────────────────────

export type PortalEmailInput = {
  tenantId: string;
  tenantName: string;
  recipientEmail: string;
  customerName: string | null;
  portalAccessUrl: string;
  expiresInMinutes: number;
};

/**
 * Enqueues a portal access email via the notification outbox.
 * Uses a simplified rendering since portal emails have different variables
 * than appointment notification templates.
 */
export async function enqueuePortalAccessEmail(
  input: PortalEmailInput
): Promise<void> {
  const { tenantId, tenantName, recipientEmail, portalAccessUrl, expiresInMinutes } = input;

  // Resolve sender identity
  const settings = await resolveNotificationSettings(tenantId, tenantName);
  if (!settings.emailNotificationsEnabled) return;

  const rendered = renderPortalAccessEmail(tenantName, portalAccessUrl, expiresInMinutes);
  const senderName = settings.senderName ?? tenantName;
  const replyToEmail = settings.replyToEmail ?? null;

  // Idempotency key: use email + timestamp rounded to minute to prevent floods
  const minuteKey = Math.floor(Date.now() / 60_000).toString();
  const idempotencyKey = `portal:${tenantId}:${recipientEmail}:${minuteKey}`;

  const supabase = createAdminClient();

  // We need a dummy appointment_id for the outbox since it's NOT NULL.
  // Use a portal-specific approach: create outbox entry directly.
  await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("notification_outbox" as never)
    .upsert({
      tenant_id: tenantId,
      appointment_id: "00000000-0000-0000-0000-000000000000", // sentinel for non-appointment emails
      event_type: "customer_portal_access",
      channel: "email",
      recipient_email: recipientEmail,
      template_type: "customer_portal_access",
      payload: { tenantName, recipientEmail, portalAccessUrl },
      idempotency_key: idempotencyKey,
      status: "pending",
      next_attempt_at: new Date().toISOString(),
      rendered_subject: rendered.subject,
      rendered_html: rendered.html,
      rendered_text: rendered.text,
      sender_name: senderName,
      reply_to_email: replyToEmail,
    } as never, { onConflict: "tenant_id,idempotency_key" } as never);
}
