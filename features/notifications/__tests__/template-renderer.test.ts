/**
 * Template Renderer Tests — Milestone 6.12.
 *
 * Tests for:
 * - Variable substitution
 * - HTML escaping
 * - Unknown variable rejection
 * - Missing optional variables
 * - Plain-text output
 * - Deterministic rendering
 * - Subject/body validation
 */

import { describe, it, expect } from "vitest";
import {
  renderNotificationTemplate,
  validateTemplate,
  validateTemplateFields,
  buildTemplateVariables,
  getDefaultTemplate,
} from "../services/template-renderer";
import type { AppointmentNotificationPayload } from "../types/notification";

describe("validateTemplate", () => {
  it("accepts templates with supported variables only", () => {
    const result = validateTemplate("Hello {{customer_name}}, your appointment {{appointment_number}}");
    expect(result.valid).toBe(true);
  });

  it("rejects templates with unknown variables", () => {
    const result = validateTemplate("Hello {{unknown_var}}");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("Unknown template variable: {{unknown_var}}");
    }
  });

  it("accepts templates without any variables", () => {
    const result = validateTemplate("Hello, plain text only");
    expect(result.valid).toBe(true);
  });

  it("rejects multiple unknown variables", () => {
    const result = validateTemplate("{{foo}} and {{bar}}");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toHaveLength(2);
    }
  });
});

describe("validateTemplateFields", () => {
  it("validates both subject and body together", () => {
    const result = validateTemplateFields(
      "Subject {{appointment_number}}",
      "Body {{customer_name}}"
    );
    expect(result.valid).toBe(true);
  });

  it("reports errors from both subject and body", () => {
    const result = validateTemplateFields(
      "Subject {{bad_var}}",
      "Body {{another_bad}}"
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("deduplicates errors when same variable appears in both", () => {
    const result = validateTemplateFields(
      "Subject {{bad_var}}",
      "Body {{bad_var}}"
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toHaveLength(1);
    }
  });
});

describe("renderNotificationTemplate", () => {
  it("substitutes all supported variables", () => {
    const values = {
      customer_name: "Jane",
      appointment_number: "APT-2025-000001",
    };
    const result = renderNotificationTemplate(
      "Confirmed: {{appointment_number}}",
      "<p>Hi {{customer_name}}</p>",
      values
    );

    expect(result.subject).toBe("Confirmed: APT-2025-000001");
    expect(result.html).toBe("<p>Hi Jane</p>");
    expect(result.text).toContain("Hi Jane");
  });

  it("escapes HTML characters in injected values for HTML output", () => {
    const values = {
      customer_name: '<script>alert("xss")</script>',
      appointment_number: "APT-001",
    };
    const result = renderNotificationTemplate(
      "Hi {{customer_name}}",
      "<p>{{customer_name}}</p>",
      values
    );

    // Subject is plain text — no escaping needed
    expect(result.subject).toContain("<script>");
    // HTML body must be escaped
    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("renders missing optional variables as empty string", () => {
    const values = {
      customer_name: "Jane",
    };
    const result = renderNotificationTemplate(
      "{{appointment_number}}",
      "<p>{{cancellation_reason}}</p>",
      values
    );

    expect(result.subject).toBe("");
    expect(result.html).toBe("<p></p>");
  });

  it("throws on unknown variables", () => {
    expect(() => {
      renderNotificationTemplate(
        "{{invalid_var}}",
        "<p>body</p>",
        {}
      );
    }).toThrow("Template validation failed");
  });

  it("produces deterministic output", () => {
    const values = { customer_name: "Jane", appointment_number: "APT-001" };
    const r1 = renderNotificationTemplate("{{appointment_number}}", "<p>{{customer_name}}</p>", values);
    const r2 = renderNotificationTemplate("{{appointment_number}}", "<p>{{customer_name}}</p>", values);

    expect(r1).toEqual(r2);
  });

  it("generates plain text by stripping HTML tags", () => {
    const result = renderNotificationTemplate(
      "Subject",
      "<h2>Title</h2><p>Paragraph 1</p><p>Paragraph 2</p>",
      {}
    );

    expect(result.text).toContain("Title");
    expect(result.text).toContain("Paragraph 1");
    expect(result.text).not.toContain("<h2>");
    expect(result.text).not.toContain("<p>");
  });

  it("handles special characters in subject (no double escaping)", () => {
    const values = { tenant_name: "Joe's Barber & Grill" };
    const result = renderNotificationTemplate(
      "Booking at {{tenant_name}}",
      "<p>{{tenant_name}}</p>",
      values
    );

    // Subject is plain text — ampersand stays as-is
    expect(result.subject).toBe("Booking at Joe's Barber & Grill");
    // HTML body escapes
    expect(result.html).toContain("Joe&#39;s Barber &amp; Grill");
  });
});

describe("buildTemplateVariables", () => {
  const basePayload: AppointmentNotificationPayload = {
    appointmentId: "uuid-1",
    appointmentNumber: "APT-2025-000042",
    customerName: "Jane Smith",
    customerEmail: "jane@example.com",
    serviceName: "Haircut",
    resourceName: "Sarah",
    locationName: "Downtown",
    startsAt: "2025-08-15T14:00:00.000Z",
    endsAt: "2025-08-15T15:00:00.000Z",
    tenantTimeZone: "America/New_York",
    price: "45.00",
    currency: "USD",
    tenantName: "Acme Salon",
  };

  it("maps all payload fields to template variables", () => {
    const vars = buildTemplateVariables(basePayload);

    expect(vars.tenant_name).toBe("Acme Salon");
    expect(vars.appointment_number).toBe("APT-2025-000042");
    expect(vars.customer_name).toBe("Jane Smith");
    expect(vars.service_name).toBe("Haircut");
    expect(vars.resource_name).toBe("Sarah");
    expect(vars.location_name).toBe("Downtown");
    expect(vars.currency).toBe("USD");
    expect(vars.time_zone).toBe("America/New_York");
  });

  it("formats price as amount with currency when > 0", () => {
    const vars = buildTemplateVariables(basePayload);
    expect(vars.price).toBe("45.00 USD");
  });

  it("formats price as Free when 0", () => {
    const vars = buildTemplateVariables({ ...basePayload, price: "0" });
    expect(vars.price).toBe("Free");
  });

  it("renders cancellation_reason as empty string when null", () => {
    const vars = buildTemplateVariables({ ...basePayload, cancellationReason: null });
    expect(vars.cancellation_reason).toBe("");
  });

  it("includes cancellation_reason when provided", () => {
    const vars = buildTemplateVariables({
      ...basePayload,
      cancellationReason: "Schedule conflict",
    });
    expect(vars.cancellation_reason).toBe("Schedule conflict");
  });

  it("formats dates using the tenant timezone", () => {
    const vars = buildTemplateVariables(basePayload);
    // 14:00 UTC = 10:00 AM Eastern
    expect(vars.appointment_date).toContain("August");
    expect(vars.appointment_date).toContain("15");
    expect(vars.appointment_start_time).toContain("10:00");
    expect(vars.appointment_end_time).toContain("11:00");
  });
});

describe("getDefaultTemplate", () => {
  it("returns created template", () => {
    const template = getDefaultTemplate("appointment_created");
    expect(template.subject).toContain("{{appointment_number}}");
    expect(template.body).toContain("{{customer_name}}");
    expect(template.body).toContain("{{service_name}}");
  });

  it("returns rescheduled template", () => {
    const template = getDefaultTemplate("appointment_rescheduled");
    expect(template.subject).toContain("rescheduled");
    expect(template.body).toContain("{{appointment_date}}");
  });

  it("returns cancelled template", () => {
    const template = getDefaultTemplate("appointment_cancelled");
    expect(template.subject).toContain("cancelled");
    expect(template.body).toContain("{{appointment_number}}");
  });

  it("all default templates pass validation", () => {
    const types = ["appointment_created", "appointment_rescheduled", "appointment_cancelled"] as const;
    for (const type of types) {
      const template = getDefaultTemplate(type);
      const result = validateTemplateFields(template.subject, template.body);
      expect(result.valid).toBe(true);
    }
  });
});
