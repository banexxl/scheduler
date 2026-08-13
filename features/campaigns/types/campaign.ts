/**
 * Campaign Types — Milestone 15.7.
 */

// ─── Campaign Status ─────────────────────────────────────────────────────────

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "processing"
  | "completed"
  | "cancelled"
  | "failed";

export type CampaignChannel = "email";

export type CampaignAudienceSource = "segment" | "built_in_segment";

// ─── Recipient Status ────────────────────────────────────────────────────────

export type RecipientStatus =
  | "eligible"
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "skipped";

export type RecipientSkipReason =
  | "marketing_opt_out"
  | "missing_email"
  | "invalid_email"
  | "customer_blocked"
  | "late_unsubscribe"
  | "duplicate"
  | "provider_error";

// ─── Campaign DTO ────────────────────────────────────────────────────────────

export type CampaignDTO = {
  id: string;
  tenantId: string;
  name: string;
  channel: CampaignChannel;
  subject: string | null;
  content: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  segmentId: string | null;
  audienceSource: CampaignAudienceSource;
  audienceNameSnapshot: string | null;
  audienceRulesSnapshot: unknown | null;
  status: CampaignStatus;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  matchedCount: number;
  eligibleCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Recipient DTO ───────────────────────────────────────────────────────────

export type CampaignRecipientDTO = {
  id: string;
  campaignId: string;
  customerId: string | null;
  customerName?: string;
  channel: CampaignChannel;
  recipientEmail: string | null;
  status: RecipientStatus;
  skipReason: RecipientSkipReason | null;
  providerMessageId: string | null;
  queuedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
};

// ─── Audience Preview ────────────────────────────────────────────────────────

export type AudiencePreview = {
  matchedCount: number;
  eligibleCount: number;
  excludedCount: number;
  exclusionReasons: Array<{ reason: RecipientSkipReason; count: number }>;
};

// ─── Marketing Eligibility ───────────────────────────────────────────────────

export type CustomerEligibility = {
  customerId: string;
  email: string | null;
  eligible: boolean;
  skipReason: RecipientSkipReason | null;
};
