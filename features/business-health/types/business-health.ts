/**
 * Business Health Types — Milestone 12.6.
 */

export const HEALTH_CATEGORIES = [
  "business", "locations", "services", "staff",
  "scheduling", "booking", "communications", "payments",
  "customer_experience", "operations",
] as const;
export type BusinessHealthCategory = typeof HEALTH_CATEGORIES[number];

export const HEALTH_STATUSES = ["ready", "needs_attention", "blocked", "optional"] as const;
export type HealthStatus = typeof HEALTH_STATUSES[number];

export type BusinessHealthCheck = {
  key: string;
  category: BusinessHealthCategory;
  title: string;
  description: string;
  status: HealthStatus;
  impact: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
};

export type BusinessHealthSummary = {
  overallStatus: "ready" | "needs_attention" | "blocked";
  readyCount: number;
  attentionCount: number;
  blockedCount: number;
  optionalCount: number;
  checks: BusinessHealthCheck[];
};
