/**
 * Reminder Template Tests — Milestone 6.13.
 *
 * Tests that the reminder template renders correctly with all variables
 * including the new reminder_offset variable.
 */

import { describe, it, expect } from "vitest";
import {
  renderNotificationTemplate,
  buildTemplateVariables,
  getDefaultTemplate,
  validateTemplateFields,
} from "../services/template-renderer";
import type { AppointmentNotificationPayload } from "../types/notification";

describe("reminder template rendering", () => {
  const basePayload: AppointmentNotificationPayload = {
    appointmentId: "uuid-1",
    appointmentNumber: "APT-2025-000099",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    serviceName: "Deep Tissue Massage",
    resourceName: "Maria",
    locationName: "Wellness Center",
    startsAt: "2025-08-20T14:00:00.000Z",
    endsAt: "2025-08-20T15:30:00.000Z",
    tenantTimeZone: "America/New_York",
    price: "85.00",
    currency: "USD",
    tenantName: "Healing Hands Spa",
    reminderOffsetMinutes: 1440,
  };

  it("includes reminder_offset in template variables", () => {
    const vars = buildTemplateVariables(basePayload);
    expect(vars.reminder_offset).toBe("1 day");
  });

  it("formats 2 hours reminder offset", () => {
    const vars = buildTemplateVariables({ ...basePayload, reminderOffsetMinutes: 120 });
    expect(vars.reminder_offset).toBe("2 hours");
  });

  it("formats 30 minutes reminder offset", () => {
    const vars = buildTemplateVariables({ ...basePayload, reminderOffsetMinutes: 30 });
    expect(vars.reminder_offset).toBe("30 minutes");
  });

  it("formats 7 days reminder offset", () => {
    const vars = buildTemplateVariables({ ...basePayload, reminderOffsetMinutes: 10080 });
    expect(vars.reminder_offset).toBe("7 days");
  });

  it("returns empty string when no reminder offset", () => {
    const vars = buildTemplateVariables({ ...basePayload, reminderOffsetMinutes: undefined });
    expect(vars.reminder_offset).toBe("");
  });

  it("default reminder template passes validation", () => {
    const template = getDefaultTemplate("appointment_reminder");
    const result = validateTemplateFields(template.subject, template.body);
    expect(result.valid).toBe(true);
  });

  it("default reminder template contains key variables", () => {
    const template = getDefaultTemplate("appointment_reminder");
    expect(template.subject).toContain("{{appointment_number}}");
    expect(template.body).toContain("{{customer_name}}");
    expect(template.body).toContain("{{reminder_offset}}");
    expect(template.body).toContain("{{service_name}}");
    expect(template.body).toContain("{{appointment_date}}");
  });

  it("renders reminder template with all variables", () => {
    const template = getDefaultTemplate("appointment_reminder");
    const vars = buildTemplateVariables(basePayload);

    const rendered = renderNotificationTemplate(
      template.subject,
      template.body,
      vars
    );

    expect(rendered.subject).toContain("APT-2025-000099");
    expect(rendered.html).toContain("John Doe");
    expect(rendered.html).toContain("1 day");
    expect(rendered.html).toContain("Deep Tissue Massage");
    expect(rendered.text).toContain("John Doe");
    expect(rendered.text).toContain("1 day");
  });

  it("escapes HTML in reminder template values", () => {
    const payload = {
      ...basePayload,
      customerName: '<b>Hacker</b>',
    };
    const template = getDefaultTemplate("appointment_reminder");
    const vars = buildTemplateVariables(payload);
    const rendered = renderNotificationTemplate(template.subject, template.body, vars);

    expect(rendered.html).not.toContain("<b>Hacker</b>");
    expect(rendered.html).toContain("&lt;b&gt;Hacker&lt;/b&gt;");
  });
});
