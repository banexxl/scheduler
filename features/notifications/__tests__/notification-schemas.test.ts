/**
 * Notification Schema Validation Tests — Milestone 6.12.
 *
 * Tests for settings and template validation schemas.
 */

import { describe, it, expect } from "vitest";
import {
  notificationSettingsSchema,
  notificationTemplateSchema,
} from "../schemas/notification-schemas";

describe("notificationSettingsSchema", () => {
  const validInput = {
    emailNotificationsEnabled: true,
    sendBookingConfirmation: true,
    sendRescheduleConfirmation: true,
    sendCancellationConfirmation: true,
    replyToEmail: "test@example.com",
    senderName: "My Business",
  };

  it("accepts valid settings", async () => {
    const result = await notificationSettingsSchema.validate(validInput);
    expect(result.emailNotificationsEnabled).toBe(true);
    expect(result.replyToEmail).toBe("test@example.com");
  });

  it("accepts null reply-to email", async () => {
    const result = await notificationSettingsSchema.validate({
      ...validInput,
      replyToEmail: null,
    });
    expect(result.replyToEmail).toBeNull();
  });

  it("normalizes empty reply-to email to null", async () => {
    const result = await notificationSettingsSchema.validate({
      ...validInput,
      replyToEmail: "   ",
    });
    expect(result.replyToEmail).toBeNull();
  });

  it("rejects invalid email format", async () => {
    await expect(
      notificationSettingsSchema.validate({
        ...validInput,
        replyToEmail: "not-an-email",
      })
    ).rejects.toThrow();
  });

  it("rejects reply-to email over 320 characters", async () => {
    const longEmail = "a".repeat(316) + "@b.co";
    expect(longEmail.length).toBeGreaterThan(320);
    await expect(
      notificationSettingsSchema.validate({
        ...validInput,
        replyToEmail: longEmail,
      })
    ).rejects.toThrow();
  });

  it("normalizes empty sender name to null", async () => {
    const result = await notificationSettingsSchema.validate({
      ...validInput,
      senderName: "",
    });
    expect(result.senderName).toBeNull();
  });

  it("rejects sender name over 120 characters", async () => {
    await expect(
      notificationSettingsSchema.validate({
        ...validInput,
        senderName: "A".repeat(121),
      })
    ).rejects.toThrow();
  });

  it("accepts settings with all events disabled", async () => {
    const result = await notificationSettingsSchema.validate({
      emailNotificationsEnabled: false,
      sendBookingConfirmation: false,
      sendRescheduleConfirmation: false,
      sendCancellationConfirmation: false,
    });
    expect(result.emailNotificationsEnabled).toBe(false);
    expect(result.sendBookingConfirmation).toBe(false);
  });
});

describe("notificationTemplateSchema", () => {
  it("accepts valid template", async () => {
    const result = await notificationTemplateSchema.validate({
      subjectTemplate: "Appointment confirmed — {{appointment_number}}",
      bodyTemplate: "<p>Hello {{customer_name}}</p>",
    });
    expect(result.subjectTemplate).toContain("{{appointment_number}}");
  });

  it("rejects empty subject", async () => {
    await expect(
      notificationTemplateSchema.validate({
        subjectTemplate: "",
        bodyTemplate: "<p>Body</p>",
      })
    ).rejects.toThrow();
  });

  it("rejects subject over 200 characters", async () => {
    await expect(
      notificationTemplateSchema.validate({
        subjectTemplate: "A".repeat(201),
        bodyTemplate: "<p>Body</p>",
      })
    ).rejects.toThrow();
  });

  it("rejects empty body", async () => {
    await expect(
      notificationTemplateSchema.validate({
        subjectTemplate: "Subject",
        bodyTemplate: "",
      })
    ).rejects.toThrow();
  });

  it("rejects body over 20000 characters", async () => {
    await expect(
      notificationTemplateSchema.validate({
        subjectTemplate: "Subject",
        bodyTemplate: "A".repeat(20001),
      })
    ).rejects.toThrow();
  });

  it("accepts maximum length subject (200 chars)", async () => {
    const result = await notificationTemplateSchema.validate({
      subjectTemplate: "A".repeat(200),
      bodyTemplate: "<p>Body</p>",
    });
    expect(result.subjectTemplate).toHaveLength(200);
  });
});
