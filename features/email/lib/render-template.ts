/**
 * Email Template Renderer — Milestone 18.2.
 *
 * Renders branded HTML email templates for booking lifecycle events.
 * Pure functions — no database access, no side effects.
 */

import type { BookingEmailData, RescheduleEmailData, CancellationEmailData } from "../types";

// ─── Shared Layout ───────────────────────────────────────────────────────────

function wrapInLayout(data: BookingEmailData, bodyHtml: string): string {
  const { tenant } = data;
  const logoHtml = tenant.logoUrl
    ? `<img src="${escapeHtml(tenant.logoUrl)}" alt="${escapeHtml(tenant.name)}" style="max-height:48px;max-width:160px;margin-bottom:16px;" />`
    : `<h2 style="color:${escapeHtml(tenant.primaryColor)};margin:0 0 16px 0;">${escapeHtml(tenant.name)}</h2>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:100%;">

<!-- Header -->
<tr><td style="background:${escapeHtml(tenant.primaryColor)};padding:24px;text-align:center;">
${logoHtml.includes("<img") ? logoHtml.replace('style="', 'style="filter:brightness(0) invert(1);') : `<h2 style="color:#ffffff;margin:0;">${escapeHtml(tenant.name)}</h2>`}
</td></tr>

<!-- Body -->
<tr><td style="padding:32px 24px;">
${bodyHtml}
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} ${escapeHtml(tenant.name)}</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function detailsTable(rows: Array<[string, string]>): string {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
${rows.map(([label, value]) => `<tr>
<td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;width:120px;">${escapeHtml(label)}</td>
<td style="padding:10px 14px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">${escapeHtml(value)}</td>
</tr>`).join("")}
</table>`;
}

function manageButton(url: string, label: string, color: string): string {
  return `<p style="text-align:center;margin:24px 0 0;">
<a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 28px;background:${escapeHtml(color)};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">${escapeHtml(label)}</a>
</p>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Confirmation Template ───────────────────────────────────────────────────

export function renderConfirmationEmail(data: BookingEmailData): { subject: string; html: string; text: string } {
  const { booking, customer } = data;
  const price = parseFloat(booking.price);

  const rows: Array<[string, string]> = [
    ["Reference", booking.reference],
    ["Service", booking.serviceName],
    ...(booking.staffName ? [["Staff", booking.staffName] as [string, string]] : []),
    ["Location", booking.locationName],
    ["Date", booking.localDate],
    ["Time", `${booking.localStartTime} – ${booking.localEndTime}`],
    ["Duration", `${booking.durationMinutes} min`],
    ...(price > 0 ? [["Price", `${booking.currency} ${booking.price}`] as [string, string]] : []),
  ];

  const bodyHtml = `
<h1 style="margin:0 0 8px;font-size:20px;color:#111827;">Booking Confirmed</h1>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Hi ${escapeHtml(customer.name)}, your appointment has been confirmed.</p>
${detailsTable(rows)}
${manageButton(data.manageUrl, "Manage Booking", data.tenant.primaryColor)}`;

  const text = `Booking Confirmed\n\nHi ${customer.name}, your appointment has been confirmed.\n\nReference: ${booking.reference}\nService: ${booking.serviceName}\nDate: ${booking.localDate} ${booking.localStartTime}–${booking.localEndTime}\nLocation: ${booking.locationName}\n\nManage: ${data.manageUrl}`;

  return {
    subject: `Booking Confirmed — ${booking.reference}`,
    html: wrapInLayout(data, bodyHtml),
    text,
  };
}

// ─── Reschedule Template ─────────────────────────────────────────────────────

export function renderRescheduleEmail(data: RescheduleEmailData): { subject: string; html: string; text: string } {
  const { booking, customer } = data;

  const bodyHtml = `
<h1 style="margin:0 0 8px;font-size:20px;color:#111827;">Appointment Rescheduled</h1>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Hi ${escapeHtml(customer.name)}, your appointment has been updated.</p>

<p style="font-size:13px;color:#6b7280;margin:0 0 4px;">Previous time:</p>
<p style="font-size:14px;color:#9ca3af;text-decoration:line-through;margin:0 0 16px;">${escapeHtml(data.previousLocalDate)} at ${escapeHtml(data.previousLocalStartTime)}</p>

<p style="font-size:13px;color:#6b7280;margin:0 0 4px;">New time:</p>
<p style="font-size:16px;font-weight:600;color:#111827;margin:0 0 16px;">${escapeHtml(booking.localDate)} at ${escapeHtml(booking.localStartTime)} – ${escapeHtml(booking.localEndTime)}</p>

${detailsTable([
    ["Reference", booking.reference],
    ["Service", booking.serviceName],
    ["Location", booking.locationName],
  ])}
${manageButton(data.manageUrl, "View Updated Booking", data.tenant.primaryColor)}`;

  const text = `Appointment Rescheduled\n\nHi ${customer.name},\n\nPrevious: ${data.previousLocalDate} at ${data.previousLocalStartTime}\nNew: ${booking.localDate} at ${booking.localStartTime}–${booking.localEndTime}\n\nReference: ${booking.reference}\nManage: ${data.manageUrl}`;

  return {
    subject: `Appointment Rescheduled — ${booking.reference}`,
    html: wrapInLayout(data, bodyHtml),
    text,
  };
}

// ─── Cancellation Template ───────────────────────────────────────────────────

export function renderCancellationEmail(data: CancellationEmailData): { subject: string; html: string; text: string } {
  const { booking, customer, cancellationReason } = data;

  const reasonHtml = cancellationReason
    ? `<p style="margin:16px 0 0;padding:12px;background:#fef2f2;border-radius:4px;font-size:13px;color:#991b1b;">Reason: ${escapeHtml(cancellationReason)}</p>`
    : "";

  const bodyHtml = `
<h1 style="margin:0 0 8px;font-size:20px;color:#dc2626;">Booking Cancelled</h1>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Hi ${escapeHtml(customer.name)}, your appointment has been cancelled.</p>
${detailsTable([
    ["Reference", booking.reference],
    ["Service", booking.serviceName],
    ["Date", booking.localDate],
    ["Time", `${booking.localStartTime} – ${booking.localEndTime}`],
    ["Location", booking.locationName],
  ])}
${reasonHtml}
${manageButton(data.manageUrl, "Book Again", data.tenant.primaryColor)}`;

  const text = `Booking Cancelled\n\nHi ${customer.name}, your appointment has been cancelled.\n\nReference: ${booking.reference}\nService: ${booking.serviceName}\nDate: ${booking.localDate}\n${cancellationReason ? `Reason: ${cancellationReason}\n` : ""}`;

  return {
    subject: `Booking Cancelled — ${booking.reference}`,
    html: wrapInLayout(data, bodyHtml),
    text,
  };
}

// ─── Reminder Template ───────────────────────────────────────────────────────

export function renderReminderEmail(data: BookingEmailData): { subject: string; html: string; text: string } {
  const { booking, customer } = data;

  const bodyHtml = `
<h1 style="margin:0 0 8px;font-size:20px;color:#111827;">Appointment Reminder</h1>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Hi ${escapeHtml(customer.name)}, this is a reminder for your upcoming appointment.</p>
${detailsTable([
    ["Reference", booking.reference],
    ["Service", booking.serviceName],
    ...(booking.staffName ? [["Staff", booking.staffName] as [string, string]] : []),
    ["Location", booking.locationName],
    ["Date", booking.localDate],
    ["Time", `${booking.localStartTime} – ${booking.localEndTime}`],
  ])}
${manageButton(data.manageUrl, "Manage Booking", data.tenant.primaryColor)}`;

  const text = `Appointment Reminder\n\nHi ${customer.name},\n\nYour appointment is coming up:\nService: ${booking.serviceName}\nDate: ${booking.localDate} at ${booking.localStartTime}\nLocation: ${booking.locationName}\n\nManage: ${data.manageUrl}`;

  return {
    subject: `Reminder: ${booking.serviceName} — ${booking.localDate}`,
    html: wrapInLayout(data, bodyHtml),
    text,
  };
}
