/**
 * Loyalty Domain Types — Milestone 8.10.
 */

// ─── Transaction Types ───────────────────────────────────────────────────────

export const LOYALTY_TRANSACTION_TYPES = [
  "earned",
  "manual_credit",
  "manual_debit",
  "reversal",
  "reward_redemption",
] as const;

export type LoyaltyTransactionType = (typeof LOYALTY_TRANSACTION_TYPES)[number];

// ─── Reward Types ────────────────────────────────────────────────────────────

export const LOYALTY_REWARD_TYPES = ["points_threshold", "visit_threshold"] as const;
export type LoyaltyRewardType = (typeof LOYALTY_REWARD_TYPES)[number];

// ─── Tenant Loyalty Settings ─────────────────────────────────────────────────

export type TenantLoyaltySettings = {
  isEnabled: boolean;
  pointsPerCompletedAppointment: number;
  countCompletedVisits: boolean;
  allowManualAdjustments: boolean;
};

export const DEFAULT_LOYALTY_SETTINGS: TenantLoyaltySettings = {
  isEnabled: false,
  pointsPerCompletedAppointment: 0,
  countCompletedVisits: true,
  allowManualAdjustments: true,
};

// ─── Customer Loyalty Account ────────────────────────────────────────────────

export type CustomerLoyaltyAccount = {
  id: string;
  tenantId: string;
  customerId: string;
  pointsBalance: number;
  lifetimePointsEarned: number;
  completedVisitCount: number;
  lastEarnedAt: string | null;
};

// ─── Loyalty Transaction ─────────────────────────────────────────────────────

export type LoyaltyTransaction = {
  id: string;
  transactionType: LoyaltyTransactionType;
  pointsDelta: number;
  balanceAfter: number;
  reason: string | null;
  appointmentId: string | null;
  createdAt: string;
};

// ─── Loyalty Reward ──────────────────────────────────────────────────────────

export type LoyaltyReward = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  rewardType: LoyaltyRewardType;
  pointsRequired: number | null;
  visitsRequired: number | null;
  isActive: boolean;
  sortOrder: number;
};

// ─── Reward Eligibility ──────────────────────────────────────────────────────

export type RewardEligibility = {
  reward: LoyaltyReward;
  isEligible: boolean;
  currentValue: number;
  requiredValue: number;
};

// ─── Portal DTO ──────────────────────────────────────────────────────────────

export type PortalLoyaltyData = {
  pointsBalance: number;
  completedVisits: number;
  recentTransactions: LoyaltyTransaction[];
  availableRewards: Array<{ name: string; isEligible: boolean }>;
};
