import "server-only";

/**
 * Marketing Eligibility Service — Milestone 15.7.
 *
 * Evaluates which customers from a segment match are eligible to receive
 * a marketing email campaign.
 *
 * CRITICAL INVARIANT: Segment match ≠ Marketing eligibility.
 * A customer matching a segment DOES NOT imply permission to market to them.
 *
 * Exclusion reasons (in priority order):
 * 1. marketing_opt_out — customer has marketing_opt_in = false
 * 2. missing_email — no email address on record
 * 3. invalid_email — email format fails basic validation
 * 4. customer_blocked — customer is blocked (from tenant_customer_private)
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { CustomerEligibility, RecipientSkipReason, AudiencePreview } from "../types/campaign";

// ─── Email validation (basic check, matches DB constraint) ───────────────────

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isValidEmail(email: string): boolean {
  return email.length >= 5 && email.length <= 320 && EMAIL_REGEX.test(email);
}

// ─── Core Eligibility Evaluator ──────────────────────────────────────────────

/**
 * Evaluates marketing eligibility for a batch of customer IDs.
 * Returns per-customer eligibility with skip reasons.
 *
 * This function is the SINGLE canonical eligibility check used by:
 * - Audience preview (editing time)
 * - Recipient snapshot (execution time)
 * - Late suppression check (delivery time)
 */
export async function evaluateMarketingEligibility(
  tenantId: string,
  customerIds: string[],
  channel: "email" = "email"
): Promise<CustomerEligibility[]> {
  if (customerIds.length === 0) return [];

  const supabase = createServiceRoleClient();

  // Batch fetch customer data + private data for blocked status
  const { data: customers } = await supabase
    .from("tenant_customers")
    .select("id, email, marketing_opt_in")
    .eq("tenant_id", tenantId)
    .in("id", customerIds);

  // Fetch blocked status from private table
  const { data: privateData } = await supabase
    .from("tenant_customer_private" as never)
    .select("tenant_customer_id, is_blocked" as never)
    .eq("tenant_id" as never, tenantId)
    .in("tenant_customer_id" as never, customerIds);

  const blockedSet = new Set(
    ((privateData ?? []) as Array<{ tenant_customer_id: string; is_blocked: boolean }>)
      .filter((p) => p.is_blocked)
      .map((p) => p.tenant_customer_id)
  );

  const results: CustomerEligibility[] = [];

  for (const customerId of customerIds) {
    const customer = (customers ?? []).find((c) => (c as { id: string }).id === customerId) as
      | { id: string; email: string | null; marketing_opt_in: boolean }
      | undefined;

    if (!customer) {
      // Customer not found — skip
      results.push({ customerId, email: null, eligible: false, skipReason: "missing_email" });
      continue;
    }

    // Check blocked first
    if (blockedSet.has(customerId)) {
      results.push({ customerId, email: customer.email, eligible: false, skipReason: "customer_blocked" });
      continue;
    }

    // Marketing opt-in check
    if (!customer.marketing_opt_in) {
      results.push({ customerId, email: customer.email, eligible: false, skipReason: "marketing_opt_out" });
      continue;
    }

    // Channel-specific checks
    if (channel === "email") {
      if (!customer.email) {
        results.push({ customerId, email: null, eligible: false, skipReason: "missing_email" });
        continue;
      }
      if (!isValidEmail(customer.email)) {
        results.push({ customerId, email: customer.email, eligible: false, skipReason: "invalid_email" });
        continue;
      }
    }

    // Eligible
    results.push({ customerId, email: customer.email, eligible: true, skipReason: null });
  }

  return results;
}

/**
 * Quick check: is a single customer eligible for marketing at delivery time?
 * Used for late suppression check before provider dispatch.
 */
export async function isCustomerMarketingEligible(
  tenantId: string,
  customerId: string,
  channel: "email" = "email"
): Promise<{ eligible: boolean; skipReason: RecipientSkipReason | null }> {
  const [result] = await evaluateMarketingEligibility(tenantId, [customerId], channel);
  if (!result) return { eligible: false, skipReason: "missing_email" };
  return { eligible: result.eligible, skipReason: result.skipReason };
}

/**
 * Generates an audience preview for campaign editing UX.
 * Shows matched vs eligible vs excluded counts.
 */
export async function getAudiencePreview(
  tenantId: string,
  matchingCustomerIds: string[],
  channel: "email" = "email"
): Promise<AudiencePreview> {
  if (matchingCustomerIds.length === 0) {
    return { matchedCount: 0, eligibleCount: 0, excludedCount: 0, exclusionReasons: [] };
  }

  const eligibility = await evaluateMarketingEligibility(tenantId, matchingCustomerIds, channel);

  const eligible = eligibility.filter((e) => e.eligible);
  const excluded = eligibility.filter((e) => !e.eligible);

  // Group exclusion reasons
  const reasonCounts = new Map<RecipientSkipReason, number>();
  for (const ex of excluded) {
    if (ex.skipReason) {
      reasonCounts.set(ex.skipReason, (reasonCounts.get(ex.skipReason) ?? 0) + 1);
    }
  }

  return {
    matchedCount: matchingCustomerIds.length,
    eligibleCount: eligible.length,
    excludedCount: excluded.length,
    exclusionReasons: Array.from(reasonCounts.entries()).map(([reason, count]) => ({ reason, count })),
  };
}
