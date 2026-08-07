/**
 * Analytics Domain Types — Milestone 8.4.
 *
 * Defines DTOs for dashboard metrics, trends, and rankings.
 * All types are serializable (no functions, dates as strings).
 */

// ─── Date Range ──────────────────────────────────────────────────────────────

export const ANALYTICS_PERIODS = ["today", "7days", "this_month", "prev_month"] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export type AnalyticsDateRange = {
  start: string; // ISO instant
  end: string;   // ISO instant
  label: string;
};

export type AnalyticsFilters = {
  period: AnalyticsPeriod;
  locationId?: string | null;
  resourceId?: string | null;
};

// ─── Summary Cards ───────────────────────────────────────────────────────────

export type DashboardSummary = {
  // Today
  todayTotal: number;
  todayUpcoming: number;
  todayCompleted: number;
  todayCancelled: number;
  todayNoShow: number;
  todayCheckedIn: number;
  todayInProgress: number;

  // Period metrics
  periodTotal: number;
  periodCompleted: number;
  periodCancelled: number;
  periodNoShow: number;
  periodBookedValue: number;
  periodCompletedValue: number;
  periodNewCustomers: number;
  periodReturningCustomers: number;

  // Rates (0–1 scale)
  cancellationRate: number | null;
  noShowRate: number | null;
  completionRate: number | null;
  averageAppointmentValue: number | null;

  // Comparison (vs previous equivalent period)
  comparison: {
    totalChange: number | null;       // percentage change
    completedChange: number | null;
    cancelledChange: number | null;
    noShowRateChange: number | null;   // percentage-point change
    valueChange: number | null;
  };

  currency: string;
};

// ─── Appointment Trend ───────────────────────────────────────────────────────

export type AppointmentTrendPoint = {
  date: string;  // YYYY-MM-DD
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

// ─── Customer Trend ──────────────────────────────────────────────────────────

export type CustomerTrendPoint = {
  date: string;
  newCustomers: number;
  returningCustomers: number;
};

// ─── Top Services ────────────────────────────────────────────────────────────

export type TopServiceItem = {
  serviceId: string;
  serviceName: string;
  appointmentCount: number;
  completedCount: number;
  cancelledCount: number;
  completedValue: number;
  currency: string;
};

// ─── Resource Analytics ──────────────────────────────────────────────────────

export type ResourceAnalyticsItem = {
  resourceId: string;
  resourceName: string;
  appointmentCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  scheduledMinutes: number;
  actualMinutes: number | null;
  utilization: number | null; // 0–1
};

// ─── Location Analytics ──────────────────────────────────────────────────────

export type LocationAnalyticsItem = {
  locationId: string;
  locationName: string;
  appointmentCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  completedValue: number;
  currency: string;
};

// ─── Booking Source ──────────────────────────────────────────────────────────

export type BookingSourceItem = {
  source: string;
  label: string;
  count: number;
  percentage: number;
};

// ─── Status Breakdown ────────────────────────────────────────────────────────

export type StatusBreakdownItem = {
  status: string;
  label: string;
  count: number;
  percentage: number;
};

// ─── Full Dashboard DTO ──────────────────────────────────────────────────────

export type DashboardAnalyticsDTO = {
  summary: DashboardSummary;
  appointmentTrend: AppointmentTrendPoint[];
  customerTrend: CustomerTrendPoint[];
  topServices: TopServiceItem[];
  resourceAnalytics: ResourceAnalyticsItem[];
  locationAnalytics: LocationAnalyticsItem[];
  bookingSources: BookingSourceItem[];
  statusBreakdown: StatusBreakdownItem[];
  period: AnalyticsPeriod;
  dateRange: AnalyticsDateRange;
  filters: AnalyticsFilters;
};
