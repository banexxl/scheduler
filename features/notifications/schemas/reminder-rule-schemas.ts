/**
 * Validation schemas for reminder rules — Milestone 6.13.
 */

import * as yup from "yup";

// ─── Create/Update Reminder Rule Schema ──────────────────────────────────────

export const reminderRuleSchema = yup.object({
  name: yup
    .string()
    .required("Name is required")
    .min(1, "Name must be at least 1 character")
    .max(120, "Name must be at most 120 characters"),
  offsetAmount: yup
    .number()
    .required("Amount is required")
    .integer("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(365, "Must be at most 365"),
  offsetUnit: yup
    .string()
    .required("Unit is required")
    .oneOf(["minutes", "hours", "days"], "Invalid unit"),
  isActive: yup.boolean().optional().default(true),
});

export type ReminderRuleFormValues = yup.InferType<typeof reminderRuleSchema>;

/**
 * Validates that the computed offset_minutes is within bounds (5–525600).
 */
export function validateOffsetMinutes(amount: number, unit: string): string | null {
  let minutes: number;
  switch (unit) {
    case "minutes": minutes = amount; break;
    case "hours": minutes = amount * 60; break;
    case "days": minutes = amount * 1440; break;
    default: return "Invalid unit";
  }

  if (minutes < 5) return "Reminder must be at least 5 minutes before";
  if (minutes > 525600) return "Reminder cannot be more than 365 days before";
  return null;
}
