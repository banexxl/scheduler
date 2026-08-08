import "server-only";

/**
 * Waitlist Offer Service — Milestone 8.8.
 *
 * Generates offers for matched waitlist entries, creates secure tokens,
 * and enqueues notification emails.
 */

import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNotificationSettings } from "@/features/notifications/services/notification-settings-service";
import { formatInTimeZone } from "date-fns-tz";
import type { MatchingSlot, MatchedEntry } from "./waitlist-matching";

const TOKEN_BYTES = 32;
const TOKEN_PREFIX_LENGTH = 10;

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

// ─── Notification Template ───────────────────────────────────────────────────

const DEFAULT_SUBJECT = "A time just opened up at {{tenant_name}}";

const DEFAULT_BODY = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Good news!</h2>
<p>Hi {{customer_name}},</p>
<p>A time just opened up for <strong>{{service_name}}</strong> at <strong>{{location_name}}</strong>:</p>
<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
<tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0; font-weight: bold;">{{appointment_date}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">Time</td><td style="padding: 8px 0; font-weight: bold;">{{appointment_time}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">With</td><td style="padding: 8px 0;">{{resource_name}}</td></tr>
</table>
<p style="margin: 24px 0;">
  <a href="{{booking_url}}" style="background-color: #1976d2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
    Book This Time
  </a>
</p>
<p style="color: #666; font-size: 13px;">This offer expires in {{offer_expires_in}}. The slot is not reserved — book promptly to secure it.</p>
</div>`;

function renderOfferEmail(vars: Record<string, string>): { subject: string; html: string; text: string } {
  const subject = DEFAULT_SUBJECT.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
  const html = DEFAULT_BODY.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k] ?? "";
    if (k === "booking_url") return v;
    return v.replace(/[&<>"']/g, (c: string) => {
      const m: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return m[c] ?? c;
    });
  });
  const text = `A time just opened up at ${vars.tenant_name}\n\n${vars.service_name} on ${vars.appointment_date} at ${vars.appointment_time}\nWith: ${vars.resource_name}\nLocation: ${vars.location_name}\n\nBook now: ${vars.booking_url}\n\nThis offer expires in ${vars.offer_expires_in}. The slot is not reserved.`;
  return { subject, html, text };
}

// ─── Generate Offers ─────────────────────────────────────────────────────────

/**
 * Generates offers for matched entries and enqueues notifications.
 */
export async function generateWaitlistOffers(
  slot: MatchingSlot,
  entries: MatchedEntry[]
): Promise<void> {
  const supabase = createAdminClient();

  // Load offer expiry setting
  const { data: settings } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_notification_settings" as never)
    .select("waitlist_offer_expiry_minutes" as never)
    .eq("tenant_id" as never, slot.tenantId)
    .single();

  const expiryMinutes = (settings as unknown as { waitlist_offer_expiry_minutes?: number })?.waitlist_offer_expiry_minutes ?? 30;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60_000).toISOString();

  // Load tenant info for notification
  const { data: tenantRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenants" as never)
    .select("name, slug, default_timezone" as never)
    .eq("id" as never, slot.tenantId)
    .single();

  if (!tenantRow) return;
  const tenant = tenantRow as unknown as { name: string; slug: string; default_timezone: string };

  // Load resource name
  const { data: resourceRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("resources" as never)
    .select("name" as never)
    .eq("id" as never, slot.resourceId)
    .single();
  const resourceName = (resourceRow as unknown as { name: string } | null)?.name ?? "Available";

  // Load service/location names
  const { data: serviceRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("services" as never)
    .select("name" as never)
    .eq("id" as never, slot.serviceId)
    .single();
  const serviceName = (serviceRow as unknown as { name: string } | null)?.name ?? "Service";

  const { data: locationRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("locations" as never)
    .select("name" as never)
    .eq("id" as never, slot.locationId)
    .single();
  const locationName = (locationRow as unknown as { name: string } | null)?.name ?? "Location";

  // Format date/time
  const appointmentDate = formatInTimeZone(slot.startsAt, tenant.default_timezone, "EEEE, MMMM d, yyyy");
  const appointmentTime = formatInTimeZone(slot.startsAt, tenant.default_timezone, "h:mm a");

  // Sender settings
  const notifSettings = await resolveNotificationSettings(slot.tenantId, tenant.name);
  const senderName = notifSettings.senderName ?? tenant.name;
  const replyToEmail = notifSettings.replyToEmail ?? null;

  const offerExpiresIn = expiryMinutes >= 60
    ? `${Math.round(expiryMinutes / 60)} hour${expiryMinutes >= 120 ? "s" : ""}`
    : `${expiryMinutes} minutes`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  for (const entry of entries) {
    if (!entry.customerEmail) continue;

    // Generate secure offer token
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const tokenPrefix = rawToken.slice(0, TOKEN_PREFIX_LENGTH);

    // Insert offer
    const { data: offerRow, error: offerError } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("waitlist_offers" as never)
      .insert({
        tenant_id: slot.tenantId,
        waitlist_entry_id: entry.id,
        service_id: slot.serviceId,
        location_id: slot.locationId,
        resource_id: slot.resourceId,
        starts_at: slot.startsAt,
        ends_at: slot.endsAt,
        status: "pending",
        expires_at: expiresAt,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
      } as never)
      .select("id")
      .single();

    if (offerError || !offerRow) continue;

    // Mark entry as matched
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("waitlist_entries" as never)
      .update({ status: "matched" } as never)
      .eq("id" as never, entry.id)
      .eq("status" as never, "active");

    // Build booking URL
    const bookingUrl = `${appUrl}/book/${tenant.slug}/waitlist/${rawToken}`;

    // Render email
    const rendered = renderOfferEmail({
      tenant_name: tenant.name,
      customer_name: entry.customerName,
      service_name: serviceName,
      location_name: locationName,
      resource_name: resourceName,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      booking_url: bookingUrl,
      offer_expires_in: offerExpiresIn,
    });

    // Enqueue notification
    const idempotencyKey = `waitlist:${entry.id}:${slot.resourceId}:${slot.startsAt}`;

    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("notification_outbox" as never)
      .upsert({
        tenant_id: slot.tenantId,
        appointment_id: "00000000-0000-0000-0000-000000000000",
        event_type: "waitlist_slot_available",
        channel: "email",
        recipient_email: entry.customerEmail,
        template_type: "waitlist_slot_available",
        payload: { entryId: entry.id, slotStartsAt: slot.startsAt },
        idempotency_key: idempotencyKey,
        status: "pending",
        next_attempt_at: new Date().toISOString(),
        rendered_subject: rendered.subject,
        rendered_html: rendered.html,
        rendered_text: rendered.text,
        sender_name: senderName,
        reply_to_email: replyToEmail,
      } as never, { onConflict: "tenant_id,idempotency_key" } as never);

    // Mark offer as notified
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("waitlist_offers" as never)
      .update({ status: "notified" } as never)
      .eq("id" as never, (offerRow as unknown as { id: string }).id);
  }
}
