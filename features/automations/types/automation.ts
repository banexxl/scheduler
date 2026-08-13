/**
 * Marketing Automation Types — Milestone 15.8.
 */

// ─── Trigger Types ───────────────────────────────────────────────────────────

export type AutomationTriggerType =
  | "appointment_completed"
  | "referral_rewarded"
  | "gift_card_purchased"
  | "customer_inactive"
  | "package_expiring"
  | "loyalty_threshold_reached";

// ─── Trigger Configs ─────────────────────────────────────────────────────────

export type AppointmentCompletedConfig = {
  service_id?: string | null; // Optional service filter
};

export type CustomerInactiveConfig = {
  days_inactive: number; // e.g. 60
};

export type PackageExpiringConfig = {
  days_before_expiry: number; // e.g. 7
};

export type LoyaltyThresholdConfig = {
  points_threshold: number; // e.g. 100
};

export type ReferralRewardedConfig = Record<string, never>;
export type GiftCardPurchasedConfig = Record<string, never>;

export type TriggerConfig =
  | AppointmentCompletedConfig
  | CustomerInactiveConfig
  | PackageExpiringConfig
  | LoyaltyThresholdConfig
  | ReferralRewardedConfig
  | GiftCardPurchasedConfig;

// ─── Re-enrollment ───────────────────────────────────────────────────────────

export type ReEnrollmentPolicy = "once_ever" | "once_per_trigger" | "after_completion";

// ─── Automation Status ───────────────────────────────────────────────────────

export type AutomationStatus = "draft" | "active" | "paused" | "archived";

// ─── Step Types ──────────────────────────────────────────────────────────────

export type StepType = "delay" | "condition" | "email";

export type DelayUnit = "minutes" | "hours" | "days" | "weeks";

export type DelayStepConfig = {
  value: number;
  unit: DelayUnit;
};

export type ConditionStepConfig = {
  field: string;
  operator: string;
  value: unknown;
};

export type EmailStepConfig = {
  subject: string;
  content: string;
  cta_text?: string | null;
  cta_url?: string | null;
};

export type StepConfig = DelayStepConfig | ConditionStepConfig | EmailStepConfig;

// ─── Enrollment Status ───────────────────────────────────────────────────────

export type EnrollmentStatus = "active" | "waiting" | "completed" | "cancelled" | "failed";

// ─── Step Execution Status ───────────────────────────────────────────────────

export type StepExecutionStatus = "pending" | "executing" | "completed" | "failed" | "skipped";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export type AutomationDTO = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  triggerType: AutomationTriggerType;
  triggerConfig: TriggerConfig;
  entryConditions: unknown | null;
  reEnrollmentPolicy: ReEnrollmentPolicy;
  timezone: string;
  status: AutomationStatus;
  currentVersionId: string | null;
  publishedAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationStepDTO = {
  id: string;
  position: number;
  stepType: StepType;
  config: StepConfig;
};

export type EnrollmentDTO = {
  id: string;
  automationId: string;
  versionId: string;
  customerId: string;
  customerName?: string;
  status: EnrollmentStatus;
  currentStepPosition: number;
  triggeredAt: string;
  nextRunAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

// ─── Automation Templates ────────────────────────────────────────────────────

export type AutomationTemplate = {
  key: string;
  name: string;
  description: string;
  triggerType: AutomationTriggerType;
  triggerConfig: TriggerConfig;
  steps: Array<{ stepType: StepType; config: StepConfig }>;
};
