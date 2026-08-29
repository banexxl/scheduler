"use server";

/**
 * Booking Email Actions — Milestone 18.2.
 *
 * Send branded transactional emails for booking lifecycle events.
 * These are fire-and-forget — failures never block booking operations.
 */

import { sendBookingEmail } from "../lib/send-email";
import {
  renderConfirmationEmail,
  renderRescheduleEmail,
  renderCancellationEmail,
  renderReminderEmail,
} from "../lib/render-template";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolvePublishedTenantTheme } from "@/features/branding/services/resolve-tenant-theme";
import type { BookingEmailData, RescheduleEmailData, CancellationEmailData } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadTenantBranding(tenantId: string): Promise<{
  name: string;
  logoUrl: string | null;
  primaryColor: string;
} | null> {
  const supabase = createServiceRoleClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, slug")
    .eq("id", tenantId)
    .single();

  if (!tenant) return null;

  const theme = await resolvePublishedTenantTheme(tenantId);

  return {
    name: tenant.name,
    logoUrl: theme.logoUrl,
    primaryColor: theme.primaryColor,
  };
}

function buildManageUrl(tenantSlug: string): string {
  const baseUrl = process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/book/${tenantSlug}/manage`;
}

// ─── Send Booking Confirmation ───────────────────────────────────────────────

export async function sendBookingConfirmationEmail(
  tenantId: string,
  tenantSlug: string,
  appointment: {
    appointmentNumber: string;
    customerName: string;
    customerEmail: string | null;
    serviceNameSnapshot: string;
    resourceNameSnapshot: string;
    locationNameSnapshot: string;
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
    price: string;
    currency: string;
  }
): Promise<void> {
  if (!appointment.customerEmail) return;

  try {
    const branding = await loadTenantBranding(tenantId);
    if (!branding) return;

    const data: BookingEmailData = {
      tenant: branding,
      booking: {
        reference: appointment.appointmentNumber,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        localDate: appointment.startsAt.slice(0, 10),
        localStartTime: new Date(appointment.startsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        localEndTime: new Date(appointment.endsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        serviceName: appointment.serviceNameSnapshot,
        staffName: appointment.resourceNameSnapshot,
        locationName: appointment.locationNameSnapshot,
        durationMinutes: appointment.durationMinutes,
        price: appointment.price,
        currency: appointment.currency,
        timeZone: "UTC",
      },
      customer: {
        name: appointment.customerName,
        email: appointment.customerEmail,
      },
      manageUrl: buildManageUrl(tenantSlug),
    };

    const rendered = renderConfirmationEmail(data);

    await sendBookingEmail({
      to: appointment.customerEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      fromName: branding.name,
      idempotencyKey: `booking-confirm:${appointment.appointmentNumber}`,
    });
  } catch (error) {
    console.error("[email] Failed to send booking confirmation:", error instanceof Error ? error.message : error);
  }
}

// ─── Send Reschedule Email ───────────────────────────────────────────────────

export async function sendRescheduleEmail(
  tenantId: string,
  tenantSlug: string,
  appointment: {
    appointmentNumber: string;
    customerName: string;
    customerEmail: string | null;
    serviceNameSnapshot: string;
    resourceNameSnapshot: string;
    locationNameSnapshot: string;
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
    price: string;
    currency: string;
  },
  previousStartsAt: string
): Promise<void> {
  if (!appointment.customerEmail) return;

  try {
    const branding = await loadTenantBranding(tenantId);
    if (!branding) return;

    const data: RescheduleEmailData = {
      tenant: branding,
      booking: {
        reference: appointment.appointmentNumber,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        localDate: appointment.startsAt.slice(0, 10),
        localStartTime: new Date(appointment.startsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        localEndTime: new Date(appointment.endsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        serviceName: appointment.serviceNameSnapshot,
        staffName: appointment.resourceNameSnapshot,
        locationName: appointment.locationNameSnapshot,
        durationMinutes: appointment.durationMinutes,
        price: appointment.price,
        currency: appointment.currency,
        timeZone: "UTC",
      },
      customer: {
        name: appointment.customerName,
        email: appointment.customerEmail,
      },
      manageUrl: buildManageUrl(tenantSlug),
      previousStartsAt,
      previousLocalDate: previousStartsAt.slice(0, 10),
      previousLocalStartTime: new Date(previousStartsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    };

    const rendered = renderRescheduleEmail(data);

    await sendBookingEmail({
      to: appointment.customerEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      fromName: branding.name,
      idempotencyKey: `booking-reschedule:${appointment.appointmentNumber}:${appointment.startsAt}`,
    });
  } catch (error) {
    console.error("[email] Failed to send reschedule email:", error instanceof Error ? error.message : error);
  }
}

// ─── Send Cancellation Email ─────────────────────────────────────────────────

export async function sendCancellationEmail(
  tenantId: string,
  tenantSlug: string,
  appointment: {
    appointmentNumber: string;
    customerName: string;
    customerEmail: string | null;
    serviceNameSnapshot: string;
    resourceNameSnapshot: string;
    locationNameSnapshot: string;
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
    price: string;
    currency: string;
  },
  cancellationReason: string | null
): Promise<void> {
  if (!appointment.customerEmail) return;

  try {
    const branding = await loadTenantBranding(tenantId);
    if (!branding) return;

    const data: CancellationEmailData = {
      tenant: branding,
      booking: {
        reference: appointment.appointmentNumber,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        localDate: appointment.startsAt.slice(0, 10),
        localStartTime: new Date(appointment.startsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        localEndTime: new Date(appointment.endsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        serviceName: appointment.serviceNameSnapshot,
        staffName: appointment.resourceNameSnapshot,
        locationName: appointment.locationNameSnapshot,
        durationMinutes: appointment.durationMinutes,
        price: appointment.price,
        currency: appointment.currency,
        timeZone: "UTC",
      },
      customer: {
        name: appointment.customerName,
        email: appointment.customerEmail,
      },
      manageUrl: buildManageUrl(tenantSlug),
      cancellationReason,
    };

    const rendered = renderCancellationEmail(data);

    await sendBookingEmail({
      to: appointment.customerEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      fromName: branding.name,
      idempotencyKey: `booking-cancel:${appointment.appointmentNumber}`,
    });
  } catch (error) {
    console.error("[email] Failed to send cancellation email:", error instanceof Error ? error.message : error);
  }
}

// ─── Send Reminder Email ─────────────────────────────────────────────────────

export async function sendReminderEmail(
  tenantId: string,
  tenantSlug: string,
  appointment: {
    appointmentNumber: string;
    customerName: string;
    customerEmail: string | null;
    serviceNameSnapshot: string;
    resourceNameSnapshot: string;
    locationNameSnapshot: string;
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
    price: string;
    currency: string;
  }
): Promise<void> {
  if (!appointment.customerEmail) return;

  try {
    const branding = await loadTenantBranding(tenantId);
    if (!branding) return;

    const data: BookingEmailData = {
      tenant: branding,
      booking: {
        reference: appointment.appointmentNumber,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        localDate: appointment.startsAt.slice(0, 10),
        localStartTime: new Date(appointment.startsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        localEndTime: new Date(appointment.endsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        serviceName: appointment.serviceNameSnapshot,
        staffName: appointment.resourceNameSnapshot,
        locationName: appointment.locationNameSnapshot,
        durationMinutes: appointment.durationMinutes,
        price: appointment.price,
        currency: appointment.currency,
        timeZone: "UTC",
      },
      customer: {
        name: appointment.customerName,
        email: appointment.customerEmail,
      },
      manageUrl: buildManageUrl(tenantSlug),
    };

    const rendered = renderReminderEmail(data);

    await sendBookingEmail({
      to: appointment.customerEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      fromName: branding.name,
      idempotencyKey: `booking-reminder:${appointment.appointmentNumber}:24h`,
    });
  } catch (error) {
    console.error("[email] Failed to send reminder email:", error instanceof Error ? error.message : error);
  }
}
