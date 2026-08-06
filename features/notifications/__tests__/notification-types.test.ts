/**
 * Notification Types and Constants Tests — Milestone 6.12.
 *
 * Verifies type constants, default settings, and retry policy values.
 */

import { describe, it, expect } from "vitest";
import {
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_TEMPLATE_TYPES,
  NOTIFICATION_OUTBOX_STATUSES,
  NOTIFICATION_DELIVERY_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_RETRY_POLICY,
  DEFAULT_NOTIFICATION_SETTINGS,
  SUPPORTED_TEMPLATE_VARIABLES,
  TEMPLATE_VARIABLE_LABELS,
  EMAIL_PROVIDERS,
} from "../types/notification";

describe("notification constants", () => {
  it("has 3 event types", () => {
    expect(NOTIFICATION_EVENT_TYPES).toHaveLength(3);
    expect(NOTIFICATION_EVENT_TYPES).toContain("appointment_created");
    expect(NOTIFICATION_EVENT_TYPES).toContain("appointment_rescheduled");
    expect(NOTIFICATION_EVENT_TYPES).toContain("appointment_cancelled");
  });

  it("template types match event types", () => {
    expect(NOTIFICATION_TEMPLATE_TYPES).toEqual(NOTIFICATION_EVENT_TYPES);
  });

  it("has 5 outbox statuses", () => {
    expect(NOTIFICATION_OUTBOX_STATUSES).toHaveLength(5);
    expect(NOTIFICATION_OUTBOX_STATUSES).toContain("pending");
    expect(NOTIFICATION_OUTBOX_STATUSES).toContain("processing");
    expect(NOTIFICATION_OUTBOX_STATUSES).toContain("sent");
    expect(NOTIFICATION_OUTBOX_STATUSES).toContain("failed");
    expect(NOTIFICATION_OUTBOX_STATUSES).toContain("cancelled");
  });

  it("has 3 delivery statuses", () => {
    expect(NOTIFICATION_DELIVERY_STATUSES).toHaveLength(3);
    expect(NOTIFICATION_DELIVERY_STATUSES).toContain("processing");
    expect(NOTIFICATION_DELIVERY_STATUSES).toContain("sent");
    expect(NOTIFICATION_DELIVERY_STATUSES).toContain("failed");
  });

  it("only supports email channel", () => {
    expect(NOTIFICATION_CHANNELS).toEqual(["email"]);
  });

  it("supports console and nodemailer providers", () => {
    expect(EMAIL_PROVIDERS).toContain("console");
    expect(EMAIL_PROVIDERS).toContain("nodemailer");
  });
});

describe("default notification settings", () => {
  it("has email notifications enabled by default", () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS.emailNotificationsEnabled).toBe(true);
  });

  it("has all event types enabled by default", () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS.sendBookingConfirmation).toBe(true);
    expect(DEFAULT_NOTIFICATION_SETTINGS.sendRescheduleConfirmation).toBe(true);
    expect(DEFAULT_NOTIFICATION_SETTINGS.sendCancellationConfirmation).toBe(true);
  });

  it("has null reply-to and sender by default", () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS.replyToEmail).toBeNull();
    expect(DEFAULT_NOTIFICATION_SETTINGS.senderName).toBeNull();
  });
});

describe("retry policy", () => {
  it("allows maximum 5 attempts", () => {
    expect(NOTIFICATION_RETRY_POLICY.maxAttempts).toBe(5);
  });

  it("has 5 delay entries matching max attempts", () => {
    expect(NOTIFICATION_RETRY_POLICY.delays).toHaveLength(5);
  });

  it("starts with immediate (0) delay", () => {
    expect(NOTIFICATION_RETRY_POLICY.delays[0]).toBe(0);
  });

  it("delays are increasing", () => {
    const delays = NOTIFICATION_RETRY_POLICY.delays;
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
    }
  });

  it("final delay is 2 hours (7200 seconds)", () => {
    expect(NOTIFICATION_RETRY_POLICY.delays[4]).toBe(7200);
  });
});

describe("template variables", () => {
  it("has 13 supported variables", () => {
    expect(SUPPORTED_TEMPLATE_VARIABLES).toHaveLength(13);
  });

  it("each variable has a label", () => {
    for (const variable of SUPPORTED_TEMPLATE_VARIABLES) {
      expect(TEMPLATE_VARIABLE_LABELS[variable]).toBeDefined();
      expect(typeof TEMPLATE_VARIABLE_LABELS[variable]).toBe("string");
      expect(TEMPLATE_VARIABLE_LABELS[variable].length).toBeGreaterThan(0);
    }
  });

  it("includes required variables for each template type", () => {
    expect(SUPPORTED_TEMPLATE_VARIABLES).toContain("tenant_name");
    expect(SUPPORTED_TEMPLATE_VARIABLES).toContain("appointment_number");
    expect(SUPPORTED_TEMPLATE_VARIABLES).toContain("customer_name");
    expect(SUPPORTED_TEMPLATE_VARIABLES).toContain("service_name");
    expect(SUPPORTED_TEMPLATE_VARIABLES).toContain("appointment_date");
    expect(SUPPORTED_TEMPLATE_VARIABLES).toContain("appointment_start_time");
    expect(SUPPORTED_TEMPLATE_VARIABLES).toContain("cancellation_reason");
  });
});
