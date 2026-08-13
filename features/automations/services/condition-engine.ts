import "server-only";

/**
 * Automation Condition Engine — Milestone 15.8.
 *
 * Evaluates condition steps using the SAME segmentation field registry
 * as the customer segmentation system. Current customer state is always
 * used (never stale snapshots).
 *
 * Reuses: ruleGroupToSQL from features/segmentation/services/evaluate-segment.ts
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { ruleGroupToSQL } from "@/features/segmentation/services/evaluate-segment";
import type { SegmentRuleGroup } from "@/features/segmentation/types/segment";

/**
 * Evaluates a condition step against the current state of a specific customer.
 *
 * The condition config maps to a single-rule SegmentRuleGroup.
 * Returns true if the customer matches the condition, false otherwise.
 *
 * Condition configs may be:
 * - Single rule: { field, operator, value }
 * - Full rule group: { operator: "and", rules: [...] }
 */
export async function evaluateConditionStep(
  tenantId: string,
  customerId: string,
  config: Record<string, unknown>
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // Build rule group from condition config
  let ruleGroup: SegmentRuleGroup;

  if (config.operator && config.rules && Array.isArray(config.rules)) {
    // Already a rule group
    ruleGroup = config as unknown as SegmentRuleGroup;
  } else if (config.field && config.operator) {
    // Single rule — wrap in an AND group
    ruleGroup = {
      operator: "and",
      rules: [{ field: config.field as string, operator: config.operator as string, value: config.value }] as SegmentRuleGroup["rules"],
    };
  } else {
    // Invalid config — pass by default
    return true;
  }

  // Translate to SQL WHERE clause using the segmentation field registry
  const whereClause = ruleGroupToSQL(ruleGroup, tenantId);

  if (whereClause === "TRUE") return true;

  // Check if this specific customer matches
  const { data, error } = await supabase.rpc("evaluate_segment_count" as never, {
    p_tenant_id: tenantId,
    p_where_clause: `${whereClause} AND tc.id = '${customerId}'`,
  } as never);

  if (error) {
    // On error, pass the condition (don't block journey)
    return true;
  }

  return Number(data) > 0;
}
