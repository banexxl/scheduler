/**
 * Notification Template Renderer — Milestone 6.12.
 *
 * Pure function that renders notification templates by substituting
 * supported variables into subject and body templates.
 *
 * Security:
 * - All injected values are HTML-escaped
 * - Unknown variables are rejected
 * - No eval, no dynamic code execution
 * - Deterministic output
 * - Does not mutate inputs
 */

import {
  SUPPORTED_TEMPLATE_VARIABLES,
  type TemplateVariable,
  type TemplateVariableValues,
  type RenderedTemplate,
  type NotificationTemplateType,
  type AppointmentNotificationPayload,
} from "../types/notification";

// ─── Variable Pattern ────────────────────────────────────────────────────────

const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

// ─── HTML Escaping ───────────────────────────────────────────────────────────

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

// ─── Strip HTML for Plain Text ───────────────────────────────────────────────

function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Validate Template ───────────────────────────────────────────────────────

export type TemplateValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

/**
 * Validates that a template only uses supported variables.
 * Returns errors for any unknown {{variable}} references.
 */
export function validateTemplate(template: string): TemplateValidationResult {
  const errors: string[] = [];
  const supportedSet = new Set<string>(SUPPORTED_TEMPLATE_VARIABLES);

  let match: RegExpExecArray | null;
  const pattern = new RegExp(VARIABLE_PATTERN.source, "g");

  while ((match = pattern.exec(template)) !== null) {
    const varName = match[1]!;
    if (!supportedSet.has(varName)) {
      errors.push(`Unknown template variable: {{${varName}}}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}

/**
 * Validates both subject and body templates together.
 */
export function validateTemplateFields(
  subject: string,
  body: string
): TemplateValidationResult {
  const subjectResult = validateTemplate(subject);
  const bodyResult = validateTemplate(body);

  const errors: string[] = [];
  if (!subjectResult.valid) errors.push(...subjectResult.errors);
  if (!bodyResult.valid) errors.push(...bodyResult.errors);

  if (errors.length > 0) {
    return { valid: false, errors: [...new Set(errors)] };
  }
  return { valid: true };
}

// ─── Render Template ─────────────────────────────────────────────────────────

/**
 * Renders a single template string by substituting variable values.
 * Unknown variables have already been validated out.
 * Missing optional variables render as empty string.
 * All values are HTML-escaped for safety.
 */
function renderTemplateString(
  template: string,
  values: TemplateVariableValues,
  escapeValues: boolean
): string {
  return template.replace(VARIABLE_PATTERN, (_match, varName: string) => {
    const value = values[varName as TemplateVariable] ?? "";
    return escapeValues ? escapeHtml(value) : value;
  });
}

/**
 * Renders a notification template with the given variable values.
 *
 * Returns subject (plain text), HTML body, and plain-text body.
 * All injected values are escaped in the HTML output.
 * Subject uses unescaped values (it's plain text in email headers).
 *
 * @throws Error if template contains unknown variables
 */
export function renderNotificationTemplate(
  subjectTemplate: string,
  bodyTemplate: string,
  values: TemplateVariableValues
): RenderedTemplate {
  // Validate before rendering
  const validation = validateTemplateFields(subjectTemplate, bodyTemplate);
  if (!validation.valid) {
    throw new Error(
      `Template validation failed: ${validation.errors.join(", ")}`
    );
  }

  // Render subject (plain text, no HTML escaping)
  const subject = renderTemplateString(subjectTemplate, values, false);

  // Render HTML body (with HTML escaping for injected values)
  const html = renderTemplateString(bodyTemplate, values, true);

  // Generate plain-text version by stripping HTML
  const text = stripHtmlToText(html);

  return { subject, html, text };
}

// ─── Build Variable Values from Payload ──────────────────────────────────────

/**
 * Maps an AppointmentNotificationPayload into template variable values.
 * Formats dates and times using the tenant timezone.
 */
export function buildTemplateVariables(
  payload: AppointmentNotificationPayload
): TemplateVariableValues {
  // Format date and time in tenant timezone
  const startDate = new Date(payload.startsAt);
  const endDate = new Date(payload.endsAt);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: payload.tenantTimeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: payload.tenantTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const appointmentDate = dateFormatter.format(startDate);
  const appointmentStartTime = timeFormatter.format(startDate);
  const appointmentEndTime = timeFormatter.format(endDate);

  // Format price
  const priceValue = parseFloat(payload.price);
  const formattedPrice = priceValue > 0
    ? `${payload.price} ${payload.currency}`
    : "Free";

  return {
    tenant_name: payload.tenantName,
    appointment_number: payload.appointmentNumber,
    customer_name: payload.customerName,
    service_name: payload.serviceName,
    resource_name: payload.resourceName,
    location_name: payload.locationName,
    appointment_date: appointmentDate,
    appointment_start_time: appointmentStartTime,
    appointment_end_time: appointmentEndTime,
    time_zone: payload.tenantTimeZone,
    price: formattedPrice,
    currency: payload.currency,
    cancellation_reason: payload.cancellationReason ?? "",
  };
}

// ─── Default Templates ───────────────────────────────────────────────────────

export type DefaultTemplate = {
  subject: string;
  body: string;
};

const DEFAULT_CREATED_TEMPLATE: DefaultTemplate = {
  subject: "Appointment confirmed — {{appointment_number}}",
  body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Appointment Confirmed</h2>
<p>Hi {{customer_name}},</p>
<p>Your appointment has been confirmed. Here are the details:</p>
<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
<tr><td style="padding: 8px 0; color: #666;">Appointment</td><td style="padding: 8px 0; font-weight: bold;">{{appointment_number}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">Service</td><td style="padding: 8px 0;">{{service_name}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0;">{{appointment_date}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">Time</td><td style="padding: 8px 0;">{{appointment_start_time}} – {{appointment_end_time}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">Location</td><td style="padding: 8px 0;">{{location_name}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">With</td><td style="padding: 8px 0;">{{resource_name}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">Price</td><td style="padding: 8px 0;">{{price}}</td></tr>
</table>
<p style="color: #666; font-size: 12px;">Time zone: {{time_zone}}</p>
<p>Thank you for booking with {{tenant_name}}!</p>
</div>`,
};

const DEFAULT_RESCHEDULED_TEMPLATE: DefaultTemplate = {
  subject: "Appointment rescheduled — {{appointment_number}}",
  body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Appointment Rescheduled</h2>
<p>Hi {{customer_name}},</p>
<p>Your appointment has been rescheduled. Here are the updated details:</p>
<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
<tr><td style="padding: 8px 0; color: #666;">Appointment</td><td style="padding: 8px 0; font-weight: bold;">{{appointment_number}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">Service</td><td style="padding: 8px 0;">{{service_name}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">New Date</td><td style="padding: 8px 0;">{{appointment_date}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">New Time</td><td style="padding: 8px 0;">{{appointment_start_time}} – {{appointment_end_time}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">Location</td><td style="padding: 8px 0;">{{location_name}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">With</td><td style="padding: 8px 0;">{{resource_name}}</td></tr>
</table>
<p style="color: #666; font-size: 12px;">Time zone: {{time_zone}}</p>
<p>If you have any questions, please contact {{tenant_name}}.</p>
</div>`,
};

const DEFAULT_CANCELLED_TEMPLATE: DefaultTemplate = {
  subject: "Appointment cancelled — {{appointment_number}}",
  body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Appointment Cancelled</h2>
<p>Hi {{customer_name}},</p>
<p>Your appointment has been cancelled.</p>
<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
<tr><td style="padding: 8px 0; color: #666;">Appointment</td><td style="padding: 8px 0; font-weight: bold;">{{appointment_number}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">Service</td><td style="padding: 8px 0;">{{service_name}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">Was Scheduled</td><td style="padding: 8px 0;">{{appointment_date}} at {{appointment_start_time}}</td></tr>
<tr><td style="padding: 8px 0; color: #666;">Location</td><td style="padding: 8px 0;">{{location_name}}</td></tr>
</table>
<p>If you would like to rebook, please contact {{tenant_name}}.</p>
</div>`,
};

/**
 * Returns the default template for a given template type.
 */
export function getDefaultTemplate(templateType: NotificationTemplateType): DefaultTemplate {
  switch (templateType) {
    case "appointment_created":
      return DEFAULT_CREATED_TEMPLATE;
    case "appointment_rescheduled":
      return DEFAULT_RESCHEDULED_TEMPLATE;
    case "appointment_cancelled":
      return DEFAULT_CANCELLED_TEMPLATE;
  }
}
