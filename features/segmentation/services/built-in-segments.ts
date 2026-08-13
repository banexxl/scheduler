/**
 * Built-In Segment Definitions — Milestone 15.6.
 *
 * System-defined segments with deterministic rules.
 * Evaluated dynamically from customer data — no membership table.
 */

import type { BuiltInSegmentKey, SegmentRuleGroup } from "../types/segment";

export type BuiltInSegmentDefinition = {
  key: BuiltInSegmentKey;
  name: string;
  description: string;
  rules: SegmentRuleGroup;
};

export const BUILT_IN_SEGMENTS: BuiltInSegmentDefinition[] = [
  {
    key: "all_customers",
    name: "All Customers",
    description: "Every customer in your business.",
    rules: { operator: "and", rules: [] },
  },
  {
    key: "new_customers",
    name: "New Customers",
    description: "Customers with at most 1 completed appointment.",
    rules: {
      operator: "and",
      rules: [{ field: "completed_appointments", operator: "less_than_or_equal", value: 1 }],
    },
  },
  {
    key: "returning_customers",
    name: "Returning Customers",
    description: "Customers with at least 2 completed appointments.",
    rules: {
      operator: "and",
      rules: [{ field: "completed_appointments", operator: "greater_than_or_equal", value: 2 }],
    },
  },
  {
    key: "frequent_customers",
    name: "Frequent Customers",
    description: "Customers with 5 or more completed appointments.",
    rules: {
      operator: "and",
      rules: [{ field: "completed_appointments", operator: "greater_than_or_equal", value: 5 }],
    },
  },
  {
    key: "inactive_customers",
    name: "Inactive Customers",
    description: "No appointment in the last 90 days and no upcoming appointment.",
    rules: {
      operator: "and",
      rules: [
        { field: "days_since_last_appointment", operator: "greater_than_or_equal", value: 90 },
        { field: "has_upcoming_appointment", operator: "is_false", value: true },
      ],
    },
  },
  {
    key: "upcoming_appointments",
    name: "Upcoming Appointments",
    description: "Customers with a future appointment scheduled.",
    rules: {
      operator: "and",
      rules: [{ field: "has_upcoming_appointment", operator: "is_true", value: true }],
    },
  },
  {
    key: "no_upcoming_appointments",
    name: "No Upcoming Appointments",
    description: "Customers without any future appointment.",
    rules: {
      operator: "and",
      rules: [{ field: "has_upcoming_appointment", operator: "is_false", value: true }],
    },
  },
  {
    key: "no_show_customers",
    name: "No-Show Customers",
    description: "Customers with at least one no-show.",
    rules: {
      operator: "and",
      rules: [{ field: "no_show_count", operator: "greater_than_or_equal", value: 1 }],
    },
  },
  {
    key: "active_packages",
    name: "Active Package Holders",
    description: "Customers with an active package.",
    rules: {
      operator: "and",
      rules: [{ field: "has_active_package", operator: "is_true", value: true }],
    },
  },
  {
    key: "gift_card_holders",
    name: "Gift Card Holders",
    description: "Customers with a claimed gift card.",
    rules: {
      operator: "and",
      rules: [{ field: "has_gift_card", operator: "is_true", value: true }],
    },
  },
  {
    key: "referral_acquired",
    name: "Referral-Acquired",
    description: "Customers acquired through a referral.",
    rules: {
      operator: "and",
      rules: [{ field: "was_referred", operator: "is_true", value: true }],
    },
  },
  {
    key: "referrers",
    name: "Referrers",
    description: "Customers who have referred others.",
    rules: {
      operator: "and",
      rules: [{ field: "has_referred_others", operator: "is_true", value: true }],
    },
  },
  {
    key: "has_review",
    name: "Reviewers",
    description: "Customers who have left at least one review.",
    rules: {
      operator: "and",
      rules: [{ field: "has_left_review", operator: "is_true", value: true }],
    },
  },
];
