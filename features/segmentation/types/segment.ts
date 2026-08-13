/**
 * Customer Segmentation Types — Milestone 15.6.
 */

// ─── Rule Operators ──────────────────────────────────────────────────────────

export type LogicalOperator = "and" | "or";

export type ComparisonOperator =
  | "equals" | "not_equals"
  | "greater_than" | "greater_than_or_equal"
  | "less_than" | "less_than_or_equal"
  | "before" | "after"
  | "within_last_days" | "more_than_days_ago"
  | "is_true" | "is_false"
  | "in" | "not_in";

// ─── Rule Fields ─────────────────────────────────────────────────────────────

export type SegmentField =
  // Appointments
  | "total_appointments"
  | "completed_appointments"
  | "cancelled_appointments"
  | "no_show_count"
  | "first_appointment_date"
  | "last_appointment_date"
  | "days_since_last_appointment"
  | "has_upcoming_appointment"
  // Service/Location
  | "has_booked_service"
  | "has_visited_location"
  // Packages
  | "has_active_package"
  | "package_count"
  // Loyalty
  | "loyalty_balance"
  // Gift Cards
  | "has_gift_card"
  | "gift_card_count"
  // Referrals
  | "was_referred"
  | "has_referred_others"
  | "successful_referral_count"
  // Reviews
  | "has_left_review"
  | "review_count"
  | "average_rating"
  // Payments
  | "lifetime_paid"
  // Marketing
  | "marketing_opt_in";

// ─── Rule Definition ─────────────────────────────────────────────────────────

export type SegmentRule = {
  field: SegmentField;
  operator: ComparisonOperator;
  value: unknown; // number, string, boolean, string[] depending on field
  currency?: string; // required for monetary fields
};

export type SegmentRuleGroup = {
  operator: LogicalOperator;
  rules: Array<SegmentRule | SegmentRuleGroup>;
};

// ─── Segment ─────────────────────────────────────────────────────────────────

export type SegmentType = "system" | "custom";

export type SegmentDTO = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  segmentType: SegmentType;
  rules: SegmentRuleGroup;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  matchCount?: number;
};

// ─── Built-In Segment Key ────────────────────────────────────────────────────

export type BuiltInSegmentKey =
  | "all_customers"
  | "new_customers"
  | "returning_customers"
  | "frequent_customers"
  | "inactive_customers"
  | "upcoming_appointments"
  | "no_upcoming_appointments"
  | "no_show_customers"
  | "active_packages"
  | "gift_card_holders"
  | "referral_acquired"
  | "referrers"
  | "has_review";

// ─── Marketing Eligibility ───────────────────────────────────────────────────

export type MarketingEligibility = {
  email: boolean;
  reasons: string[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_RULES_PER_SEGMENT = 20;
export const MAX_NESTING_DEPTH = 2;
