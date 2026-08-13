import "server-only";

/**
 * Audience Resolver — Milestone 15.7.
 *
 * Resolves campaign audience by:
 * 1. Loading segment (saved or built-in)
 * 2. Evaluating segment rules against current customer data
 * 3. Evaluating marketing eligibility for each match
 * 4. Snapshotting audience rules for campaign history
 *
 * KEY POLICIES:
 * - Audience is re-evaluated at execution time (not editing time)
 * - Audience rules are snapshotted for immutable campaign history
 * - Segment deletion does NOT destroy campaign history
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSegmentMatchingCustomerIds } from "@/features/segmentation/services/evaluate-segment";
import { BUILT_IN_SEGMENTS } from "@/features/segmentation/services/built-in-segments";
import { evaluateMarketingEligibility } from "./marketing-eligibility";
import type { SegmentRuleGroup } from "@/features/segmentation/types/segment";
import type { CustomerEligibility, CampaignAudienceSource } from "../types/campaign";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AudienceResolution = {
  audienceSource: CampaignAudienceSource;
  audienceNameSnapshot: string;
  audienceRulesSnapshot: SegmentRuleGroup;
  matchedCustomerIds: string[];
  eligibility: CustomerEligibility[];
  matchedCount: number;
  eligibleCount: number;
};

// ─── Resolve Audience at Execution Time ──────────────────────────────────────

/**
 * Fully resolves a campaign's audience for execution.
 *
 * Steps:
 * 1. Load segment rules (saved segment from DB or built-in)
 * 2. Re-evaluate segment against current customer data
 * 3. Evaluate marketing eligibility
 * 4. Return full resolution with snapshots
 *
 * This is called at execution time (send now / scheduled fire).
 * The audience is re-evaluated with CURRENT data.
 */
export async function resolveAudienceForExecution(
  tenantId: string,
  segmentId: string | null,
  audienceSource: CampaignAudienceSource,
  channel: "email" = "email"
): Promise<AudienceResolution> {
  let rules: SegmentRuleGroup;
  let audienceName: string;

  if (audienceSource === "built_in_segment" && segmentId) {
    // Built-in segment: lookup by key
    const builtIn = BUILT_IN_SEGMENTS.find((s) => s.key === segmentId);
    if (!builtIn) {
      throw new Error(`Built-in segment not found: ${segmentId}`);
    }
    rules = builtIn.rules;
    audienceName = builtIn.name;
  } else if (segmentId) {
    // Saved custom segment
    const supabase = createServiceRoleClient();
    const { data: segment } = await supabase
      .from("customer_segments")
      .select("name, rules")
      .eq("id", segmentId)
      .eq("tenant_id", tenantId)
      .single();

    if (!segment) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    rules = segment.rules as unknown as SegmentRuleGroup;
    audienceName = segment.name;
  } else {
    // No segment — all customers
    rules = { operator: "and", rules: [] };
    audienceName = "All Customers";
  }

  // Re-evaluate segment against current data
  const matchedCustomerIds = await getSegmentMatchingCustomerIds(tenantId, rules);

  // Evaluate marketing eligibility
  const eligibility = await evaluateMarketingEligibility(tenantId, matchedCustomerIds, channel);

  const eligibleCount = eligibility.filter((e) => e.eligible).length;

  return {
    audienceSource,
    audienceNameSnapshot: audienceName,
    audienceRulesSnapshot: rules,
    matchedCustomerIds,
    eligibility,
    matchedCount: matchedCustomerIds.length,
    eligibleCount,
  };
}

/**
 * Quick audience preview for campaign editing UX.
 * Does NOT snapshot — just provides counts.
 */
export async function previewAudience(
  tenantId: string,
  segmentId: string | null,
  audienceSource: CampaignAudienceSource,
  channel: "email" = "email"
): Promise<{ matchedCount: number; eligibleCount: number; excludedCount: number }> {
  let rules: SegmentRuleGroup;

  if (audienceSource === "built_in_segment" && segmentId) {
    const builtIn = BUILT_IN_SEGMENTS.find((s) => s.key === segmentId);
    if (!builtIn) return { matchedCount: 0, eligibleCount: 0, excludedCount: 0 };
    rules = builtIn.rules;
  } else if (segmentId) {
    const supabase = createServiceRoleClient();
    const { data: segment } = await supabase
      .from("customer_segments")
      .select("rules")
      .eq("id", segmentId)
      .eq("tenant_id", tenantId)
      .single();

    if (!segment) return { matchedCount: 0, eligibleCount: 0, excludedCount: 0 };
    rules = segment.rules as unknown as SegmentRuleGroup;
  } else {
    rules = { operator: "and", rules: [] };
  }

  const matchedCustomerIds = await getSegmentMatchingCustomerIds(tenantId, rules);
  const eligibility = await evaluateMarketingEligibility(tenantId, matchedCustomerIds, channel);
  const eligibleCount = eligibility.filter((e) => e.eligible).length;

  return {
    matchedCount: matchedCustomerIds.length,
    eligibleCount,
    excludedCount: matchedCustomerIds.length - eligibleCount,
  };
}
