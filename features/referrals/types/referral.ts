/**
 * Referral Program Types — Milestone 15.3.
 */

export type ReferrerRewardType = "loyalty_points" | "fixed_discount" | "percentage_discount";
export type ReferredIncentiveType = "fixed_discount" | "percentage_discount";
export type QualificationRule = "first_completed_appointment";
export type ReferralStatus = "attributed" | "booked" | "qualified" | "rewarded" | "disqualified" | "cancelled";

// ─── Program Settings ────────────────────────────────────────────────────────

export type ReferralProgramDTO = {
  enabled: boolean;
  referrerRewardType: ReferrerRewardType;
  referrerRewardValue: number;
  referredIncentiveType: ReferredIncentiveType | null;
  referredIncentiveValue: number | null;
  qualificationRule: QualificationRule;
  attributionWindowDays: number;
  currency: string | null;
};

// ─── Referral Code ───────────────────────────────────────────────────────────

export type ReferralCodeDTO = {
  id: string;
  code: string;
  isActive: boolean;
  createdAt: string;
};

// ─── Customer Referral ───────────────────────────────────────────────────────

export type CustomerReferralDTO = {
  id: string;
  tenantId: string;
  referrerCustomerId: string;
  referredCustomerEmail: string | null;
  referredCustomerId: string | null;
  status: ReferralStatus;
  attributedAt: string;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  disqualificationReason: string | null;
  qualifyingAppointmentId: string | null;
};

// ─── Referral Dashboard ──────────────────────────────────────────────────────

export type ReferralDashboardMetrics = {
  totalAttributed: number;
  totalQualified: number;
  totalRewarded: number;
  conversionRate: number; // qualified / attributed
};
