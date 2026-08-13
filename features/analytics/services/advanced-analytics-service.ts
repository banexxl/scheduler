import "server-only";

/**
 * Advanced Analytics Service — Milestone 15.9.
 *
 * Orchestrates analytics queries using existing RPCs and new ones.
 * All aggregation happens in PostgreSQL — never loads full history into Node.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveAdvancedDateRange } from "./advanced-date-ranges";
import { getTenantPaymentSummary } from "@/features/payments/services/financial-history-queries";
import type { AdvancedAnalyticsFilters, CustomerRetentionMetrics, FinancialSummary, MarketingAnalytics, PackageAnalytics, GiftCardAnalytics, ReviewAnalytics } from "../types/advanced-analytics";

// ─── Customer Retention ──────────────────────────────────────────────────────

export async function getCustomerRetentionAnalytics(
  tenantId: string,
  timeZone: string,
  filters: AdvancedAnalyticsFilters
): Promise<CustomerRetentionMetrics> {
  const supabase = createServiceRoleClient();
  const range = resolveAdvancedDateRange(filters.period, new Date(), timeZone, filters.customStart, filters.customEnd);

  const { data } = await supabase.rpc("get_customer_retention_analytics" as never, {
    p_tenant_id: tenantId,
    p_range_start: range.start,
    p_range_end: range.end,
  } as never);

  const result = (data as unknown as Record<string, unknown>) ?? {};

  return {
    totalCustomers: Number(result.total_customers ?? 0),
    newCustomers: Number(result.new_customers ?? 0),
    returningCustomers: Number(result.returning_customers ?? 0),
    repeatCustomerRate: result.repeat_rate !== null ? Number(result.repeat_rate) : null,
    averageVisitsPerCustomer: result.avg_visits !== null ? Number(result.avg_visits) : null,
    inactiveCustomers: Number(result.inactive ?? 0),
    customersWithUpcoming: Number(result.with_upcoming ?? 0),
  };
}

// ─── Financial Analytics ─────────────────────────────────────────────────────

export async function getFinancialAnalytics(
  tenantId: string,
  timeZone: string,
  filters: AdvancedAnalyticsFilters
): Promise<FinancialSummary> {
  const range = resolveAdvancedDateRange(filters.period, new Date(), timeZone, filters.customStart, filters.customEnd);

  const summary = await getTenantPaymentSummary(tenantId, range.start, range.end);

  return {
    currencies: summary.currencies.map((c) => ({
      currency: c.currency,
      collected: c.paymentsReceived,
      refunded: c.refunded,
      netCollected: c.netCustomerPayments,
      appointmentPayments: 0, // Detailed breakdown available from RPC
      packagePurchases: 0,
      giftCardSales: 0,
    })),
    totalTransactions: summary.totalAppointmentPayments + summary.totalPackagePurchases,
    totalRefunds: summary.totalRefunds,
  };
}

// ─── Marketing Analytics ─────────────────────────────────────────────────────

export async function getMarketingAnalytics(
  tenantId: string,
  timeZone: string,
  filters: AdvancedAnalyticsFilters
): Promise<MarketingAnalytics> {
  const supabase = createServiceRoleClient();
  const range = resolveAdvancedDateRange(filters.period, new Date(), timeZone, filters.customStart, filters.customEnd);

  const { data } = await supabase.rpc("get_marketing_analytics_summary" as never, {
    p_tenant_id: tenantId,
    p_range_start: range.start,
    p_range_end: range.end,
  } as never);

  const result = (data as unknown as Record<string, unknown>) ?? {};
  const campaigns = (result.campaigns as Record<string, unknown>) ?? {};
  const automations = (result.automations as Record<string, unknown>) ?? {};
  const referrals = (result.referrals as Record<string, unknown>) ?? {};

  return {
    campaigns: {
      totalSent: Number(campaigns.total_sent ?? 0),
      totalRecipients: Number(campaigns.total_recipients ?? 0),
      totalDelivered: Number(campaigns.total_delivered ?? 0),
      totalFailed: Number(campaigns.total_failed ?? 0),
      totalSkipped: Number(campaigns.total_skipped ?? 0),
    },
    automations: {
      activeAutomations: Number(automations.active_automations ?? 0),
      totalEnrollments: Number(automations.total_enrollments ?? 0),
      completedJourneys: Number(automations.completed_journeys ?? 0),
      failedJourneys: Number(automations.failed_journeys ?? 0),
      emailsSent: Number(automations.emails_sent ?? 0),
      emailsSkipped: Number(automations.emails_skipped ?? 0),
    },
    referrals: {
      totalAttributed: Number(referrals.total_attributed ?? 0),
      totalQualified: Number(referrals.total_qualified ?? 0),
      qualificationRate: referrals.qualification_rate !== null ? Number(referrals.qualification_rate) : null,
    },
  };
}

// ─── Package Analytics ───────────────────────────────────────────────────────

export async function getPackageAnalytics(
  tenantId: string,
  timeZone: string,
  filters: AdvancedAnalyticsFilters
): Promise<PackageAnalytics> {
  const supabase = createServiceRoleClient();
  const range = resolveAdvancedDateRange(filters.period, new Date(), timeZone, filters.customStart, filters.customEnd);

  const { data } = await supabase.rpc("get_package_analytics" as never, {
    p_tenant_id: tenantId,
    p_range_start: range.start,
    p_range_end: range.end,
  } as never);

  const result = (data as unknown as Record<string, unknown>) ?? {};

  return {
    sold: Number(result.sold ?? 0),
    active: Number(result.active ?? 0),
    expired: Number(result.expired ?? 0),
    creditsIssued: Number(result.credits_issued ?? 0),
    creditsConsumed: Number(result.credits_consumed ?? 0),
    creditsRemaining: Number(result.credits_remaining ?? 0),
    revenueByCurrency: [], // Would need dedicated query
  };
}

// ─── Gift Card Analytics ─────────────────────────────────────────────────────

export async function getGiftCardAnalytics(
  tenantId: string,
  timeZone: string,
  filters: AdvancedAnalyticsFilters
): Promise<GiftCardAnalytics> {
  const supabase = createServiceRoleClient();
  const range = resolveAdvancedDateRange(filters.period, new Date(), timeZone, filters.customStart, filters.customEnd);

  const { data } = await supabase.rpc("get_gift_card_analytics" as never, {
    p_tenant_id: tenantId,
    p_range_start: range.start,
    p_range_end: range.end,
  } as never);

  const result = (data as unknown as Record<string, unknown>) ?? {};

  type CurrencyItem = { currency: string; amount: number };
  const parseAmounts = (raw: unknown): CurrencyItem[] =>
    ((raw as CurrencyItem[]) ?? []).map((i) => ({ currency: i.currency, amount: Number(i.amount) }));

  return {
    sold: Number(result.sold ?? 0),
    valueIssuedByCurrency: parseAmounts(result.value_issued),
    valueRedeemedByCurrency: parseAmounts(result.value_redeemed),
    outstandingByCurrency: parseAmounts(result.outstanding),
  };
}

// ─── Review Analytics ────────────────────────────────────────────────────────

export async function getReviewAnalytics(
  tenantId: string
): Promise<ReviewAnalytics> {
  const supabase = createServiceRoleClient();

  const { data: reviews } = await supabase
    .from("customer_reviews")
    .select("rating")
    .eq("tenant_id", tenantId)
    .eq("status", "published");

  const rows = (reviews ?? []) as Array<{ rating: number }>;

  if (rows.length === 0) {
    return { totalReviews: 0, averageRating: null, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of rows) {
    sum += r.rating;
    distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
  }

  return {
    totalReviews: rows.length,
    averageRating: Math.round((sum / rows.length) * 10) / 10,
    ratingDistribution: distribution,
  };
}
