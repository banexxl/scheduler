/**
 * Advanced Analytics Types — Milestone 15.9.
 *
 * Extends existing analytics types with financial, marketing,
 * customer retention, and export support.
 */

// ─── Extended Date Range ─────────────────────────────────────────────────────

export const ADVANCED_ANALYTICS_PERIODS = [
  "today", "7days", "30days", "this_month", "prev_month",
  "this_quarter", "this_year", "custom",
] as const;

export type AdvancedAnalyticsPeriod = (typeof ADVANCED_ANALYTICS_PERIODS)[number];

export type AdvancedAnalyticsFilters = {
  period: AdvancedAnalyticsPeriod;
  customStart?: string; // ISO date (YYYY-MM-DD)
  customEnd?: string;   // ISO date (YYYY-MM-DD)
  locationId?: string | null;
  resourceId?: string | null;
  serviceId?: string | null;
  comparison?: boolean; // Enable comparison to previous period
};

// ─── Report Types ────────────────────────────────────────────────────────────

export type AnalyticsReportType =
  | "overview"
  | "appointments"
  | "customers"
  | "services"
  | "staff"
  | "locations"
  | "finance"
  | "marketing";

// ─── Comparison Metric ───────────────────────────────────────────────────────

export type ComparisonMetric = {
  current: number;
  previous: number | null;
  change: number | null;       // Percentage change
  changeDirection: "up" | "down" | "flat" | null;
};

// ─── Currency-Grouped Financial ──────────────────────────────────────────────

export type CurrencyAmount = {
  currency: string;
  amount: number; // Minor units
};

export type FinancialSummary = {
  currencies: Array<{
    currency: string;
    collected: number;       // Total settled payments (minor units)
    refunded: number;        // Total refunds
    netCollected: number;    // collected - refunded
    appointmentPayments: number;
    packagePurchases: number;
    giftCardSales: number;
  }>;
  totalTransactions: number;
  totalRefunds: number;
};

// ─── Customer Retention ──────────────────────────────────────────────────────

export type CustomerRetentionMetrics = {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatCustomerRate: number | null;    // customers with >=2 completed / customers with >=1 completed
  averageVisitsPerCustomer: number | null;
  inactiveCustomers: number;
  customersWithUpcoming: number;
};

// ─── Service Performance ─────────────────────────────────────────────────────

export type ServicePerformanceItem = {
  serviceId: string;
  serviceName: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShows: number;
  uniqueCustomers: number;
  completionRate: number | null;
  cancellationRate: number | null;
  noShowRate: number | null;
  collectedByCurrency: CurrencyAmount[];
  averageRating: number | null;
  reviewCount: number;
};

// ─── Staff/Resource Performance ──────────────────────────────────────────────

export type StaffPerformanceItem = {
  resourceId: string;
  resourceName: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShows: number;
  bookedMinutes: number;
  availableMinutes: number | null;
  utilization: number | null;      // 0–1: bookedMinutes / availableMinutes
  uniqueCustomers: number;
  collectedByCurrency: CurrencyAmount[];
};

// ─── Location Performance ────────────────────────────────────────────────────

export type LocationPerformanceItem = {
  locationId: string;
  locationName: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShows: number;
  uniqueCustomers: number;
  noShowRate: number | null;
  collectedByCurrency: CurrencyAmount[];
};

// ─── Marketing Analytics ─────────────────────────────────────────────────────

export type MarketingAnalytics = {
  campaigns: {
    totalSent: number;
    totalRecipients: number;
    totalDelivered: number;
    totalFailed: number;
    totalSkipped: number;
  };
  automations: {
    activeAutomations: number;
    totalEnrollments: number;
    completedJourneys: number;
    failedJourneys: number;
    emailsSent: number;
    emailsSkipped: number;
  };
  referrals: {
    totalAttributed: number;
    totalQualified: number;
    qualificationRate: number | null;
  };
};

// ─── Package Analytics ───────────────────────────────────────────────────────

export type PackageAnalytics = {
  sold: number;
  active: number;
  expired: number;
  creditsIssued: number;
  creditsConsumed: number;
  creditsRemaining: number;
  revenueByCurrency: CurrencyAmount[];
};

// ─── Gift Card Analytics ─────────────────────────────────────────────────────

export type GiftCardAnalytics = {
  sold: number;
  valueIssuedByCurrency: CurrencyAmount[];
  valueRedeemedByCurrency: CurrencyAmount[];
  outstandingByCurrency: CurrencyAmount[];
};

// ─── Review Analytics ────────────────────────────────────────────────────────

export type ReviewAnalytics = {
  totalReviews: number;
  averageRating: number | null;
  ratingDistribution: Record<number, number>; // 1-5 → count
};

// ─── Saved Report ────────────────────────────────────────────────────────────

export type SavedReportDTO = {
  id: string;
  tenantId: string;
  name: string;
  reportType: AnalyticsReportType;
  filters: AdvancedAnalyticsFilters;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Export ──────────────────────────────────────────────────────────────────

export type ExportFormat = "csv" | "xlsx";

export type ExportRequest = {
  reportType: AnalyticsReportType;
  filters: AdvancedAnalyticsFilters;
  format: ExportFormat;
};

export const MAX_EXPORT_ROWS = 10000;
export const MAX_CUSTOM_RANGE_DAYS = 1825; // ~5 years
