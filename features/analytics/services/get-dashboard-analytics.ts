import "server-only";

/**
 * Dashboard Analytics Orchestrator — Milestone 8.4 / Performance 10.2.
 *
 * Uses server-side SQL aggregation via RPC to avoid loading thousands
 * of appointment rows into Node. Returns compact aggregate DTOs.
 */

import { createClient } from "@/lib/supabase/server";
import {
  resolveAnalyticsDateRange,
  resolveComparisonRange,
} from "./analytics-date-ranges";
import { getTodaySummary } from "@/features/appointments/services/get-today-summary";
import type {
  AnalyticsFilters,
  DashboardAnalyticsDTO,
  DashboardSummary,
  AppointmentTrendPoint,
  TopServiceItem,
  ResourceAnalyticsItem,
  LocationAnalyticsItem,
  BookingSourceItem,
  StatusBreakdownItem,
  CustomerTrendPoint,
} from "../types/analytics";

// ─── Source Labels ───────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  internal: "Internal",
  online: "Online",
  walk_in: "Walk-in",
  phone: "Phone",
  public_booking: "Public Booking",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

// ─── Main Entry Point ────────────────────────────────────────────────────────

export async function getDashboardAnalytics(
  tenantId: string,
  timeZone: string,
  currency: string,
  filters: AnalyticsFilters
): Promise<DashboardAnalyticsDTO> {
  const now = new Date();
  const dateRange = resolveAnalyticsDateRange(filters.period, now, timeZone);
  const compRange = resolveComparisonRange(filters.period, now, timeZone);

  const supabase = await createClient();

  // Call aggregation RPC — single DB round-trip for all analytics
  const { data: rpcResult } = await (supabase as never as Awaited<ReturnType<typeof createClient>>).rpc(
    "get_dashboard_analytics_summary" as never,
    {
      p_tenant_id: tenantId,
      p_range_start: dateRange.start,
      p_range_end: dateRange.end,
      p_comp_start: compRange?.start ?? null,
      p_comp_end: compRange?.end ?? null,
      p_location_id: filters.locationId ?? null,
      p_resource_id: filters.resourceId ?? null,
    } as never
  );

  // Today summary (lightweight count query)
  const todaySummary = await getTodaySummary(tenantId, timeZone);

  // Parse RPC result
  const agg = (rpcResult as unknown as Record<string, unknown>) ?? {};
  const period = (agg.period as Record<string, unknown>) ?? {};
  const comp = (agg.comparison as Record<string, unknown>) ?? null;

  const periodTotal = Number(period.total ?? 0);
  const periodCompleted = Number(period.completed ?? 0);
  const periodCancelled = Number(period.cancelled ?? 0);
  const periodNoShow = Number(period.no_show ?? 0);
  const periodBookedValue = Number(period.booked_value ?? 0);
  const periodCompletedValue = Number(period.completed_value ?? 0);
  const periodNewCustomers = Number(agg.new_customers ?? 0);
  const periodReturningCustomers = Number(agg.returning_customers ?? 0);

  // Rates
  const pastTotal = periodCompleted + periodCancelled + periodNoShow;
  const cancellationRate = pastTotal > 0 ? periodCancelled / pastTotal : null;
  const completedAndNoShow = periodCompleted + periodNoShow;
  const noShowRate = completedAndNoShow > 0 ? periodNoShow / completedAndNoShow : null;
  const completionRate = pastTotal > 0 ? periodCompleted / pastTotal : null;
  const averageAppointmentValue = periodCompleted > 0
    ? periodCompletedValue / periodCompleted : null;

  // Comparison
  let comparison = {
    totalChange: null as number | null,
    completedChange: null as number | null,
    cancelledChange: null as number | null,
    noShowRateChange: null as number | null,
    valueChange: null as number | null,
  };

  if (comp) {
    const compTotal = Number(comp.total ?? 0);
    const compCompleted = Number(comp.completed ?? 0);
    const compCancelled = Number(comp.cancelled ?? 0);
    const compNoShow = Number(comp.no_show ?? 0);
    const compValue = Number(comp.completed_value ?? 0);
    const compNoShowRate = (compCompleted + compNoShow) > 0
      ? compNoShow / (compCompleted + compNoShow) : null;

    comparison = {
      totalChange: compTotal > 0 ? ((periodTotal - compTotal) / compTotal) * 100 : null,
      completedChange: compCompleted > 0 ? ((periodCompleted - compCompleted) / compCompleted) * 100 : null,
      cancelledChange: compCancelled > 0 ? ((periodCancelled - compCancelled) / compCancelled) * 100 : null,
      noShowRateChange: (noShowRate !== null && compNoShowRate !== null)
        ? (noShowRate - compNoShowRate) * 100 : null,
      valueChange: compValue > 0 ? ((periodCompletedValue - compValue) / compValue) * 100 : null,
    };
  }

  // Trend
  const trendRaw = (agg.trend as Array<Record<string, unknown>>) ?? [];
  const appointmentTrend: AppointmentTrendPoint[] = trendRaw.map((t) => ({
    date: String(t.date ?? ""),
    total: Number(t.total ?? 0),
    completed: Number(t.completed ?? 0),
    cancelled: Number(t.cancelled ?? 0),
    noShow: Number(t.no_show ?? 0),
  }));

  // Customer trend (simplified placeholder)
  const customerTrend: CustomerTrendPoint[] = appointmentTrend.map((t) => ({
    date: t.date,
    newCustomers: 0,
    returningCustomers: 0,
  }));

  // Top services
  const servicesRaw = (agg.top_services as Array<Record<string, unknown>>) ?? [];
  const topServices: TopServiceItem[] = servicesRaw.map((s) => ({
    serviceId: String(s.service_id ?? ""),
    serviceName: String(s.service_name ?? ""),
    appointmentCount: Number(s.appointment_count ?? 0),
    completedCount: Number(s.completed_count ?? 0),
    cancelledCount: Number(s.cancelled_count ?? 0),
    completedValue: Number(s.completed_value ?? 0),
    currency,
  }));

  // Resource analytics
  const resourcesRaw = (agg.resource_analytics as Array<Record<string, unknown>>) ?? [];
  const resourceAnalytics: ResourceAnalyticsItem[] = resourcesRaw.map((r) => ({
    resourceId: String(r.resource_id ?? ""),
    resourceName: String(r.resource_name ?? ""),
    appointmentCount: Number(r.appointment_count ?? 0),
    completedCount: Number(r.completed_count ?? 0),
    cancelledCount: Number(r.cancelled_count ?? 0),
    noShowCount: Number(r.no_show_count ?? 0),
    scheduledMinutes: Number(r.scheduled_minutes ?? 0),
    actualMinutes: null,
    utilization: null,
  }));

  // Location analytics
  const locationsRaw = (agg.location_analytics as Array<Record<string, unknown>>) ?? [];
  const locationAnalytics: LocationAnalyticsItem[] = locationsRaw.map((l) => ({
    locationId: String(l.location_id ?? ""),
    locationName: String(l.location_name ?? ""),
    appointmentCount: Number(l.appointment_count ?? 0),
    completedCount: Number(l.completed_count ?? 0),
    cancelledCount: Number(l.cancelled_count ?? 0),
    noShowCount: Number(l.no_show_count ?? 0),
    completedValue: Number(l.completed_value ?? 0),
    currency,
  }));

  // Booking sources
  const sourcesRaw = (agg.booking_sources as Array<Record<string, unknown>>) ?? [];
  const bookingSources: BookingSourceItem[] = sourcesRaw.map((s) => ({
    source: String(s.source ?? "unknown"),
    label: SOURCE_LABELS[String(s.source ?? "unknown")] ?? String(s.source ?? "unknown"),
    count: Number(s.count ?? 0),
    percentage: periodTotal > 0 ? Number(s.count ?? 0) / periodTotal : 0,
  }));

  // Status breakdown
  const statusesRaw = (agg.status_breakdown as Array<Record<string, unknown>>) ?? [];
  const statusBreakdown: StatusBreakdownItem[] = statusesRaw.map((s) => ({
    status: String(s.status ?? ""),
    label: STATUS_LABELS[String(s.status ?? "")] ?? String(s.status ?? ""),
    count: Number(s.count ?? 0),
    percentage: periodTotal > 0 ? Number(s.count ?? 0) / periodTotal : 0,
  }));

  // Assemble DTO
  const summary: DashboardSummary = {
    todayTotal: todaySummary.total,
    todayUpcoming: todaySummary.upcoming,
    todayCompleted: todaySummary.completed,
    todayCancelled: 0,
    todayNoShow: 0,
    todayCheckedIn: todaySummary.checkedIn,
    todayInProgress: todaySummary.inProgress,
    periodTotal,
    periodCompleted,
    periodCancelled,
    periodNoShow,
    periodBookedValue,
    periodCompletedValue,
    periodNewCustomers,
    periodReturningCustomers,
    cancellationRate,
    noShowRate,
    completionRate,
    averageAppointmentValue,
    comparison,
    currency,
  };

  return {
    summary,
    appointmentTrend,
    customerTrend,
    topServices,
    resourceAnalytics,
    locationAnalytics,
    bookingSources,
    statusBreakdown,
    period: filters.period,
    dateRange,
    filters,
  };
}
