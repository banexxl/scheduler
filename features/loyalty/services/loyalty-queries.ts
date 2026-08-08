import "server-only";

/**
 * Loyalty Query Services — Milestone 8.10.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CustomerLoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyReward,
  RewardEligibility,
  PortalLoyaltyData,
} from "../types/loyalty";

// ─── Get Customer Account ────────────────────────────────────────────────────

export async function getCustomerLoyaltyAccount(
  tenantId: string,
  customerId: string
): Promise<CustomerLoyaltyAccount | null> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_loyalty_accounts" as never)
    .select("id, tenant_id, customer_id, points_balance, lifetime_points_earned, completed_visit_count, last_earned_at" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("customer_id" as never, customerId)
    .single();

  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;

  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    customerId: row.customer_id as string,
    pointsBalance: row.points_balance as number,
    lifetimePointsEarned: row.lifetime_points_earned as number,
    completedVisitCount: row.completed_visit_count as number,
    lastEarnedAt: (row.last_earned_at as string) ?? null,
  };
}

// ─── Get Transactions ────────────────────────────────────────────────────────

export async function getLoyaltyTransactions(
  tenantId: string,
  customerId: string,
  limit = 20
): Promise<LoyaltyTransaction[]> {
  const supabase = createAdminClient();

  // Get account first
  const { data: acctRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_loyalty_accounts" as never)
    .select("id" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("customer_id" as never, customerId)
    .single();

  if (!acctRow) return [];

  const accountId = (acctRow as unknown as { id: string }).id;

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_loyalty_transactions" as never)
    .select("id, transaction_type, points_delta, balance_after, reason, appointment_id, created_at" as never)
    .eq("customer_loyalty_account_id" as never, accountId)
    .order("created_at" as never, { ascending: false })
    .limit(limit);

  if (!data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map((row): LoyaltyTransaction => ({
    id: row.id as string,
    transactionType: row.transaction_type as LoyaltyTransaction["transactionType"],
    pointsDelta: row.points_delta as number,
    balanceAfter: row.balance_after as number,
    reason: (row.reason as string) ?? null,
    appointmentId: (row.appointment_id as string) ?? null,
    createdAt: row.created_at as string,
  }));
}

// ─── Get Rewards ─────────────────────────────────────────────────────────────

export async function getLoyaltyRewards(tenantId: string): Promise<LoyaltyReward[]> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("loyalty_rewards" as never)
    .select("id, tenant_id, name, description, reward_type, points_required, visits_required, is_active, sort_order" as never)
    .eq("tenant_id" as never, tenantId)
    .order("sort_order" as never, { ascending: true });

  if (!data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map((row): LoyaltyReward => ({
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    rewardType: row.reward_type as LoyaltyReward["rewardType"],
    pointsRequired: (row.points_required as number) ?? null,
    visitsRequired: (row.visits_required as number) ?? null,
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order as number,
  }));
}

// ─── Get Reward Eligibility ──────────────────────────────────────────────────

export async function getCustomerRewardEligibility(
  tenantId: string,
  customerId: string
): Promise<RewardEligibility[]> {
  const [account, rewards] = await Promise.all([
    getCustomerLoyaltyAccount(tenantId, customerId),
    getLoyaltyRewards(tenantId),
  ]);

  if (!account) return rewards.filter(r => r.isActive).map(r => ({
    reward: r,
    isEligible: false,
    currentValue: 0,
    requiredValue: r.pointsRequired ?? r.visitsRequired ?? 0,
  }));

  return rewards.filter(r => r.isActive).map((reward): RewardEligibility => {
    if (reward.rewardType === "points_threshold") {
      return {
        reward,
        isEligible: account.pointsBalance >= (reward.pointsRequired ?? 0),
        currentValue: account.pointsBalance,
        requiredValue: reward.pointsRequired ?? 0,
      };
    }
    return {
      reward,
      isEligible: account.completedVisitCount >= (reward.visitsRequired ?? 0),
      currentValue: account.completedVisitCount,
      requiredValue: reward.visitsRequired ?? 0,
    };
  });
}

// ─── Portal Loyalty Data ─────────────────────────────────────────────────────

export async function getPortalLoyaltyData(
  tenantId: string,
  normalizedEmail: string
): Promise<PortalLoyaltyData | null> {
  const supabase = createAdminClient();

  // Find customer by email
  const { data: customerRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_customers" as never)
    .select("id" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("email" as never, normalizedEmail)
    .single();

  if (!customerRow) return null;
  const customerId = (customerRow as unknown as { id: string }).id;

  const [account, transactions, eligibility] = await Promise.all([
    getCustomerLoyaltyAccount(tenantId, customerId),
    getLoyaltyTransactions(tenantId, customerId, 10),
    getCustomerRewardEligibility(tenantId, customerId),
  ]);

  if (!account) return null;

  return {
    pointsBalance: account.pointsBalance,
    completedVisits: account.completedVisitCount,
    recentTransactions: transactions,
    availableRewards: eligibility.map(e => ({ name: e.reward.name, isEligible: e.isEligible })),
  };
}
