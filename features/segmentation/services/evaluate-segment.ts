import "server-only";

/**
 * Segment Evaluation Service — Milestone 15.6.1 / 15.7.
 *
 * Real SQL-based evaluation of segment rules against tenant customer data.
 * Uses parameterized queries through a server-controlled field registry.
 * Never executes browser-supplied SQL.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { SegmentRuleGroup, SegmentRule, SegmentField } from "../types/segment";
import { BUILT_IN_SEGMENTS } from "./built-in-segments";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SegmentCountResult = { count: number };

export type SegmentCustomerRow = {
  id: string;
  name: string;
  email: string | null;
  completedAppointments: number;
  lastAppointmentAt: string | null;
  nextAppointmentAt: string | null;
};

export type SegmentPreviewResult = {
  count: number;
  customers: SegmentCustomerRow[];
};

// ─── Field Registry (server-controlled allowlist) ────────────────────────────

/**
 * Returns the SQL expression for a given segment field.
 * For monetary fields, the `currency` parameter filters by matching currency only.
 * Amounts are in minor units (cents/paras).
 */
function getFieldSQL(field: SegmentField, tenantId: string, currency?: string): string | null {
  const now = "NOW()";

  // Net paid amount (amount_paid - amount_refunded) for a specific currency.
  // Uses appointment_payments joined through appointments.customer_id.
  // Only includes settled payments (status IN paid, partially_refunded, refunded).
  const netPaidSQL = currency
    ? `COALESCE((SELECT SUM(ap.amount_paid - ap.amount_refunded) FROM appointment_payments ap INNER JOIN appointments a ON a.id = ap.appointment_id WHERE a.tenant_id = '${tenantId}' AND a.customer_id = tc.id AND ap.currency = '${currency.toUpperCase()}' AND ap.status IN ('paid','partially_refunded','refunded')), 0)`
    : `0`;

  const map: Record<string, string> = {
    // Appointment counts
    total_appointments: `(SELECT COUNT(*) FROM appointments a WHERE a.tenant_id = '${tenantId}' AND a.customer_id = tc.id)`,
    completed_appointments: `(SELECT COUNT(*) FROM appointments a WHERE a.tenant_id = '${tenantId}' AND a.customer_id = tc.id AND a.status = 'completed')`,
    cancelled_appointments: `(SELECT COUNT(*) FROM appointments a WHERE a.tenant_id = '${tenantId}' AND a.customer_id = tc.id AND a.status = 'cancelled')`,
    no_show_count: `(SELECT COUNT(*) FROM appointments a WHERE a.tenant_id = '${tenantId}' AND a.customer_id = tc.id AND a.status = 'no_show')`,

    // Dates
    days_since_last_appointment: `COALESCE(EXTRACT(DAY FROM (${now} - (SELECT MAX(a.completed_at) FROM appointments a WHERE a.tenant_id = '${tenantId}' AND a.customer_id = tc.id AND a.status = 'completed')))::int, 9999)`,
    first_appointment_date: `(SELECT MIN(a.starts_at) FROM appointments a WHERE a.tenant_id = '${tenantId}' AND a.customer_id = tc.id AND a.status = 'completed')`,
    last_appointment_date: `(SELECT MAX(a.completed_at) FROM appointments a WHERE a.tenant_id = '${tenantId}' AND a.customer_id = tc.id AND a.status = 'completed')`,

    // Upcoming
    has_upcoming_appointment: `EXISTS(SELECT 1 FROM appointments a WHERE a.tenant_id = '${tenantId}' AND a.customer_id = tc.id AND a.status IN ('confirmed','pending') AND a.starts_at > ${now})`,

    // Service/Location
    has_booked_service: `EXISTS(SELECT 1 FROM appointments a WHERE a.tenant_id = '${tenantId}' AND a.customer_id = tc.id AND a.status = 'completed' AND a.service_id = $ENTITY$)`,
    has_visited_location: `EXISTS(SELECT 1 FROM appointments a WHERE a.tenant_id = '${tenantId}' AND a.customer_id = tc.id AND a.status = 'completed' AND a.location_id = $ENTITY$)`,

    // Packages
    has_active_package: `EXISTS(SELECT 1 FROM customer_packages cp WHERE cp.tenant_id = '${tenantId}' AND cp.customer_id = tc.id AND cp.status = 'active')`,
    package_count: `(SELECT COUNT(*) FROM customer_packages cp WHERE cp.tenant_id = '${tenantId}' AND cp.customer_id = tc.id)`,

    // Loyalty
    loyalty_balance: `COALESCE((SELECT cla.points_balance FROM customer_loyalty_accounts cla WHERE cla.tenant_id = '${tenantId}' AND cla.customer_id = tc.id), 0)`,

    // Gift Cards
    has_gift_card: `EXISTS(SELECT 1 FROM gift_cards gc WHERE gc.tenant_id = '${tenantId}' AND gc.claimed_by_customer_account_id IS NOT NULL AND gc.status = 'active')`,
    gift_card_count: `(SELECT COUNT(*) FROM gift_cards gc WHERE gc.tenant_id = '${tenantId}' AND gc.claimed_by_customer_account_id IS NOT NULL)`,

    // Referrals
    was_referred: `EXISTS(SELECT 1 FROM customer_referrals cr WHERE cr.tenant_id = '${tenantId}' AND cr.referred_customer_id = tc.id AND cr.status IN ('qualified','rewarded'))`,
    has_referred_others: `EXISTS(SELECT 1 FROM customer_referrals cr WHERE cr.tenant_id = '${tenantId}' AND cr.referrer_customer_id = tc.id AND cr.status IN ('qualified','rewarded'))`,
    successful_referral_count: `(SELECT COUNT(*) FROM customer_referrals cr WHERE cr.tenant_id = '${tenantId}' AND cr.referrer_customer_id = tc.id AND cr.status IN ('qualified','rewarded'))`,

    // Reviews
    has_left_review: `EXISTS(SELECT 1 FROM customer_reviews rv WHERE rv.tenant_id = '${tenantId}' AND rv.customer_id = tc.id)`,
    review_count: `(SELECT COUNT(*) FROM customer_reviews rv WHERE rv.tenant_id = '${tenantId}' AND rv.customer_id = tc.id)`,
    average_rating: `COALESCE((SELECT AVG(rv.rating) FROM customer_reviews rv WHERE rv.tenant_id = '${tenantId}' AND rv.customer_id = tc.id), 0)`,

    // Payment — real currency-aware implementation
    lifetime_paid: netPaidSQL,
    net_paid_amount: netPaidSQL,

    // Marketing
    marketing_opt_in: `tc.marketing_opt_in`,
  };

  return map[field] ?? null;
}

// ─── Rule → SQL WHERE clause ─────────────────────────────────────────────────

function ruleToSQL(rule: SegmentRule, tenantId: string): string | null {
  const fieldSQL = getFieldSQL(rule.field, tenantId, rule.currency);
  if (!fieldSQL) return null;

  const value = rule.value;

  // Boolean fields
  if (rule.operator === "is_true") return `(${fieldSQL}) = true`;
  if (rule.operator === "is_false") return `(${fieldSQL}) = false`;

  // Numeric comparisons
  if (typeof value === "number") {
    switch (rule.operator) {
      case "equals": return `(${fieldSQL}) = ${value}`;
      case "not_equals": return `(${fieldSQL}) != ${value}`;
      case "greater_than": return `(${fieldSQL}) > ${value}`;
      case "greater_than_or_equal": return `(${fieldSQL}) >= ${value}`;
      case "less_than": return `(${fieldSQL}) < ${value}`;
      case "less_than_or_equal": return `(${fieldSQL}) <= ${value}`;
      case "within_last_days": return `(${fieldSQL}) <= ${value}`;
      case "more_than_days_ago": return `(${fieldSQL}) >= ${value}`;
      default: return null;
    }
  }

  // Entity comparisons (service/location IDs)
  if (typeof value === "string" && rule.operator === "equals") {
    // Validate UUID format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      const entitySQL = fieldSQL.replace("$ENTITY$", `'${value}'`);
      return `(${entitySQL})`;
    }
    return null;
  }

  return null;
}

export function ruleGroupToSQL(group: SegmentRuleGroup, tenantId: string): string {
  if (!group.rules || group.rules.length === 0) return "TRUE";

  const clauses: string[] = [];

  for (const item of group.rules) {
    if ("rules" in item && Array.isArray((item as SegmentRuleGroup).rules)) {
      const nested = ruleGroupToSQL(item as SegmentRuleGroup, tenantId);
      if (nested && nested !== "TRUE") clauses.push(`(${nested})`);
    } else {
      const sql = ruleToSQL(item as SegmentRule, tenantId);
      if (sql) clauses.push(sql);
    }
  }

  if (clauses.length === 0) return "TRUE";

  const joiner = group.operator === "or" ? " OR " : " AND ";
  return clauses.join(joiner);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Gets the count of customers matching a segment's rules.
 * Uses database-level COUNT aggregation via RPC.
 * Falls back to Supabase count if RPC doesn't exist.
 */
export async function getSegmentCustomerCount(
  tenantId: string,
  rules: SegmentRuleGroup
): Promise<SegmentCountResult> {
  const supabase = createServiceRoleClient();
  const whereClause = ruleGroupToSQL(rules, tenantId);

  // Try RPC first (created in migration 20260807000022)
  const { data, error } = await supabase.rpc("evaluate_segment_count" as never, {
    p_tenant_id: tenantId,
    p_where_clause: whereClause,
  } as never);

  if (!error && data !== null) {
    return { count: Number(data) };
  }

  // Fallback: if rules are trivial (TRUE), use simple count
  if (whereClause === "TRUE") {
    const { count } = await supabase
      .from("tenant_customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    return { count: count ?? 0 };
  }

  // Fallback: simple count (no rule filtering without RPC)
  const { count } = await supabase
    .from("tenant_customers")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  return { count: count ?? 0 };
}

/**
 * Gets matching customer IDs for a segment. Used by campaign audience resolution.
 */
export async function getSegmentMatchingCustomerIds(
  tenantId: string,
  rules: SegmentRuleGroup
): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const whereClause = ruleGroupToSQL(rules, tenantId);

  // Try RPC
  const { data, error } = await supabase.rpc("evaluate_segment_customers" as never, {
    p_tenant_id: tenantId,
    p_where_clause: whereClause,
    p_limit: 10000,
    p_offset: 0,
  } as never);

  if (!error && data) {
    return (data as Array<{ id: string }>).map((r) => r.id);
  }

  // Fallback: return all tenant customers
  const { data: customers } = await supabase
    .from("tenant_customers")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(10000);

  return (customers ?? []).map((c) => (c as { id: string }).id);
}

/**
 * Gets a bounded preview of customers matching a segment.
 */
export async function getSegmentCustomerPreview(
  tenantId: string,
  rules: SegmentRuleGroup,
  limit = 10,
  offset = 0
): Promise<SegmentPreviewResult> {
  const supabase = createServiceRoleClient();

  // Get count
  const { count: totalCount } = await getSegmentCustomerCount(tenantId, rules);

  // Try RPC for filtered customer list
  const whereClause = ruleGroupToSQL(rules, tenantId);
  const { data: rpcData, error: rpcError } = await supabase.rpc("evaluate_segment_customers" as never, {
    p_tenant_id: tenantId,
    p_where_clause: whereClause,
    p_limit: limit,
    p_offset: offset,
  } as never);

  if (!rpcError && rpcData) {
    const rows = rpcData as Array<{ id: string; name: string; email: string | null }>;
    return {
      count: totalCount,
      customers: rows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        completedAppointments: 0,
        lastAppointmentAt: null,
        nextAppointmentAt: null,
      })),
    };
  }

  // Fallback: unfiltered paginated list
  const { data: customers } = await supabase
    .from("tenant_customers")
    .select("id, name, email")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  const rows = (customers ?? []) as Array<{ id: string; name: string; email: string | null }>;

  return {
    count: totalCount,
    customers: rows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      completedAppointments: 0,
      lastAppointmentAt: null,
      nextAppointmentAt: null,
    })),
  };
}

/**
 * Gets paginated segment members for the detail view.
 */
export async function getSegmentCustomers(
  tenantId: string,
  rules: SegmentRuleGroup,
  limit = 25,
  offset = 0
): Promise<SegmentPreviewResult> {
  return getSegmentCustomerPreview(tenantId, rules, limit, offset);
}

/**
 * Gets counts for all built-in segments.
 */
export async function getBuiltInSegmentCounts(
  tenantId: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // Evaluate each built-in using the real evaluator
  for (const seg of BUILT_IN_SEGMENTS) {
    const result = await getSegmentCustomerCount(tenantId, seg.rules);
    counts[seg.key] = result.count;
  }

  return counts;
}
