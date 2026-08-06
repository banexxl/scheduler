/**
 * Validation schemas for notification settings and templates — Milestone 6.12.
 */

import * as yup from "yup";

// ─── Notification Settings Schema ────────────────────────────────────────────

export const notificationSettingsSchema = yup.object({
  emailNotificationsEnabled: yup.boolean().required("Required"),
  sendBookingConfirmation: yup.boolean().required("Required"),
  sendRescheduleConfirmation: yup.boolean().required("Required"),
  sendCancellationConfirmation: yup.boolean().required("Required"),
  replyToEmail: yup
    .string()
    .nullable()
    .optional()
    .transform((value) => (typeof value === "string" && value.trim() === "" ? null : value))
    .test(
      "valid-email-if-present",
      "Must be a valid email address",
      (value) => !value || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
    )
    .test(
      "max-length",
      "Must be at most 320 characters",
      (value) => !value || value.length <= 320
    ),
  senderName: yup
    .string()
    .nullable()
    .optional()
    .transform((value) => (typeof value === "string" && value.trim() === "" ? null : value))
    .test(
      "length-if-present",
      "Must be between 1 and 120 characters",
      (value) => !value || (value.trim().length >= 1 && value.length <= 120)
    ),
});

export type NotificationSettingsFormValues = yup.InferType<typeof notificationSettingsSchema>;

// ─── Notification Template Schema ────────────────────────────────────────────

export const notificationTemplateSchema = yup.object({
  subjectTemplate: yup
    .string()
    .required("Subject is required")
    .min(1, "Subject must be at least 1 character")
    .max(200, "Subject must be at most 200 characters"),
  bodyTemplate: yup
    .string()
    .required("Body is required")
    .min(1, "Body must be at least 1 character")
    .max(20000, "Body must be at most 20,000 characters"),
});

export type NotificationTemplateFormValues = yup.InferType<typeof notificationTemplateSchema>;
