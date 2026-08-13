/**
 * Segment Rule Validation — Milestone 15.6.
 *
 * Validates segment rules against an allowlist of fields and operators.
 * Never accepts raw SQL or arbitrary field names.
 */

import type { SegmentRule, SegmentRuleGroup, SegmentField, ComparisonOperator } from "../types/segment";
import { MAX_RULES_PER_SEGMENT, MAX_NESTING_DEPTH } from "../types/segment";

// ─── Allowed Fields & Operators ──────────────────────────────────────────────

const NUMERIC_FIELDS: SegmentField[] = [
  "total_appointments", "completed_appointments", "cancelled_appointments",
  "no_show_count", "days_since_last_appointment", "package_count",
  "loyalty_balance", "gift_card_count", "successful_referral_count",
  "review_count", "average_rating", "lifetime_paid", "net_paid_amount",
];

const BOOLEAN_FIELDS: SegmentField[] = [
  "has_upcoming_appointment", "has_active_package", "has_gift_card",
  "was_referred", "has_referred_others", "has_left_review", "marketing_opt_in",
];

const DATE_FIELDS: SegmentField[] = [
  "first_appointment_date", "last_appointment_date",
];

const ENTITY_FIELDS: SegmentField[] = [
  "has_booked_service", "has_visited_location",
];

const NUMERIC_OPERATORS: ComparisonOperator[] = [
  "equals", "not_equals", "greater_than", "greater_than_or_equal",
  "less_than", "less_than_or_equal",
];

const BOOLEAN_OPERATORS: ComparisonOperator[] = ["is_true", "is_false"];

const DATE_OPERATORS: ComparisonOperator[] = [
  "before", "after", "within_last_days", "more_than_days_ago",
];

const ENTITY_OPERATORS: ComparisonOperator[] = ["in", "not_in", "equals"];

const MONETARY_FIELDS: SegmentField[] = ["lifetime_paid", "net_paid_amount"];

// ─── Validation ──────────────────────────────────────────────────────────────

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

export function validateSegmentRules(rules: unknown): ValidationResult {
  if (!rules || typeof rules !== "object") {
    return { valid: false, errors: ["Rules must be an object."] };
  }

  const errors: string[] = [];
  let ruleCount = 0;

  function validate(group: unknown, depth: number) {
    if (depth > MAX_NESTING_DEPTH) {
      errors.push(`Maximum nesting depth (${MAX_NESTING_DEPTH}) exceeded.`);
      return;
    }

    const g = group as Record<string, unknown>;
    if (!g.operator || !["and", "or"].includes(String(g.operator))) {
      errors.push("Group must have operator 'and' or 'or'.");
      return;
    }

    const items = g.rules;
    if (!Array.isArray(items)) {
      errors.push("Group rules must be an array.");
      return;
    }

    for (const item of items) {
      const r = item as Record<string, unknown>;
      if (r.operator === "and" || r.operator === "or") {
        validate(r, depth + 1);
      } else {
        ruleCount++;
        if (ruleCount > MAX_RULES_PER_SEGMENT) {
          errors.push(`Maximum ${MAX_RULES_PER_SEGMENT} rules exceeded.`);
          return;
        }
        validateRule(r, errors);
      }
    }
  }

  validate(rules, 0);
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

function validateRule(rule: Record<string, unknown>, errors: string[]) {
  const field = String(rule.field ?? "");
  const operator = String(rule.operator ?? "");

  const allFields: SegmentField[] = [...NUMERIC_FIELDS, ...BOOLEAN_FIELDS, ...DATE_FIELDS, ...ENTITY_FIELDS];
  if (!allFields.includes(field as SegmentField)) {
    errors.push(`Invalid field: "${field}".`);
    return;
  }

  // Validate operator for field type
  if (NUMERIC_FIELDS.includes(field as SegmentField)) {
    if (!NUMERIC_OPERATORS.includes(operator as ComparisonOperator)) {
      errors.push(`Invalid operator "${operator}" for numeric field "${field}".`);
    }
    if (typeof rule.value !== "number") {
      errors.push(`Field "${field}" requires a numeric value.`);
    }
    // Monetary fields require currency
    if (MONETARY_FIELDS.includes(field as SegmentField) && !rule.currency) {
      errors.push(`Field "${field}" requires a currency.`);
    }
  } else if (BOOLEAN_FIELDS.includes(field as SegmentField)) {
    if (!BOOLEAN_OPERATORS.includes(operator as ComparisonOperator)) {
      errors.push(`Invalid operator "${operator}" for boolean field "${field}".`);
    }
  } else if (DATE_FIELDS.includes(field as SegmentField)) {
    if (!DATE_OPERATORS.includes(operator as ComparisonOperator)) {
      errors.push(`Invalid operator "${operator}" for date field "${field}".`);
    }
  } else if (ENTITY_FIELDS.includes(field as SegmentField)) {
    if (!ENTITY_OPERATORS.includes(operator as ComparisonOperator)) {
      errors.push(`Invalid operator "${operator}" for entity field "${field}".`);
    }
  }
}

/**
 * Generates a human-readable summary from segment rules.
 */
export function formatRuleSummary(group: SegmentRuleGroup): string {
  if (!group.rules || group.rules.length === 0) return "All customers";

  const parts = group.rules.map((item) => {
    if ("rules" in item && Array.isArray((item as SegmentRuleGroup).rules)) {
      return `(${formatRuleSummary(item as SegmentRuleGroup)})`;
    }
    const rule = item as SegmentRule;
    return formatSingleRule(rule);
  });

  const joiner = group.operator === "and" ? " AND " : " OR ";
  return parts.join(joiner);
}

function formatSingleRule(rule: SegmentRule): string {
  const field = rule.field.replace(/_/g, " ");
  const op = rule.operator.replace(/_/g, " ");
  const val = rule.currency ? `${rule.value} ${rule.currency}` : String(rule.value);
  return `${field} ${op} ${val}`;
}
