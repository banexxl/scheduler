import "server-only";

/**
 * Dashboard Analytics Orchestrator — Milestone 8.4.
 *
 * Composes all analytics queries into the full DashboardAnalyticsDTO.
 * Single entry point called from the dashboard page.tsx.
 */

import { createClient } from "@/lib/supabase/server";
import {
  resolveAnalyticsDateRange,
  resolveComparisonRange,
  getDateSeriesInRange,
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

  // Load appointments for the selected period
  let query = supabase
    .from("appointments")
    .select("id, status, source, starts_at, ends_at, price, currency, " +
      "service_id, service_name_snapshot, resource_id, resource_name_snapshot, " +
      "location_id, location_name_snapshot, customer_id, customer_email, " +
      "duration_minutes, created_at, service_started_at, completed_at")
    .eq("tenant_id", tenantId)
    .gte("starts_at", dateRange.start)
    .lt("starts_at", dateRange.end);

  if (filters.locationId) query = query.eq("location_id", filters.locationId);
  if (filters.resourceId) query = query.eq("resource_id", filters.resourceId);

  const { data: periodRows } = await query.order("starts_at").limit(5000);
  const appointments = (periodRows ?? []) as unknown as Array<Record<string, unknown>>;

  // Load comparison period
  let compAppointments: Array<Record<string, unknown>> = [];
  if (compRange) {
    let compQuery = supabase
      .from("appointments")
      .select("id, status, price")
      .eq("tenant_id", tenantId)
      .gte("starts_at", compRange.start)
      .lt("starts_at", compRange.end);
    if (filters.locationId) compQuery = compQuery.eq("location_id", filters.locationId);
    if (filters.resourceId) compQuery = compQuery.eq("resource_id", filters.resourceId);
    const { data: compRows } = await compQuery.limit(5000);
    compAppointments = (compRows ?? []) as Array<Record<string, unknown>>;
  }

  // Today summary
  const todaySummary = await getTodaySummary(tenantId, timeZone);

  // ─── Compute Metrics ────────────────────────────────────────────────────
  const periodTotal = appointments.length;
  const periodCompleted = appointments.filter(a => a.status === "completed").length;
  const periodCancelled = appointments.filter(a => a.status === "cancelled").length;
  const periodNoShow = appointments.filter(a => a.status === "no_show").length;

  const periodBookedValue = appointments
    .filter(a => a.status !== "cancelled")
    .reduce((sum, a) => sum + Number(a.price ?? 0), 0);
  const periodCompletedValue = appointments
    .filter(a => a.status === "completed")
    .reduce((sum, a) => sum + Number(a.price ?? 0), 0);

  // Rates
  const pastAppointments = appointments.filter(a =>
    ["completed", "cancelled", "no_show"].includes(a.status as string)
  );
  const pastTotal = pastAppointments.length;
  const cancellationRate = pastTotal > 0 ? periodCancelled / pastTotal : null;
  const completedAndNoShow = periodCompleted + periodNoShow;
  const noShowRate = completedAndNoShow > 0 ? periodNoShow / completedAndNoShow : null;
  const completionRate = pastTotal > 0 ? periodCompleted / pastTotal : null;
  const averageAppointmentValue = periodCompleted > 0
    ? periodCompletedValue / periodCompleted : null;

  // Customer metrics
  const customerEmails = new Set(
    appointments
      .filter(a => a.customer_email && a.status !== "cancelled")
      .map(a => (a.customer_email as string).toLowerCase())
  );

  // New vs returning: check if customer had appointments before this period
  let periodNewCustomers = 0;
  let periodReturningCustomers = 0;
  if (customerEmails.size > 0) {
    const emailArray = [...customerEmails];
    const { data: priorRows } = await supabase
      .from("appointments")
      .select("customer_email")
      .eq("tenant_id", tenantId)
      .lt("starts_at", dateRange.start)
      .neq("status", "cancelled")
      .in("customer_email", emailArray)
      .limit(5000);
    const priorEmails = new Set(
      ((priorRows ?? []) as Array<Record<string, unknown>>)
        .map(r => ((r.customer_email as string) ?? "").toLowerCase())
    );
    for (const email of customerEmails) {
      if (priorEmails.has(email)) periodReturningCustomers++;
      else periodNewCustomers++;
    }
  }

  // Comparison
  const compTotal = compAppointments.length;
  const compCompleted = compAppointments.filter(a => a.status === "completed").length;
  const compCancelled = compAppointments.filter(a => a.status === "cancelled").length;
  const compNoShow = compAppointments.filter(a => a.status === "no_show").length;
  const compValue = compAppointments
    .filter(a => a.status === "completed")
    .reduce((sum, a) => sum + Number(a.price ?? 0), 0);
  const compNoShowRate = (compCompleted + compNoShow) > 0
    ? compNoShow / (compCompleted + compNoShow) : null;

  const comparison = {
    totalChange: compTotal > 0 ? ((periodTotal - compTotal) / compTotal) * 100 : null,
    completedChange: compCompleted > 0 ? ((periodCompleted - compCompleted) / compCompleted) * 100 : null,
    cancelledChange: compCancelled > 0 ? ((periodCancelled - compCancelled) / compCancelled) * 100 : null,
    noShowRateChange: (noShowRate !== null && compNoShowRate !== null)
      ? (noShowRate - compNoShowRate) * 100 : null,
    valueChange: compValue > 0 ? ((periodCompletedValue - compValue) / compValue) * 100 : null,
  };

  // ─── Appointment Trend ──────────────────────────────────────────────────
  const dateSeries = getDateSeriesInRange(dateRange.start, dateRange.end, timeZone);
  const trendMap = new Map<string, AppointmentTrendPoint>();
  for (const d of dateSeries) {
    trendMap.set(d, { date: d, total: 0, completed: 0, cancelled: 0, noShow: 0 });
  }
  for (const a of appointments) {
    const d = (a.starts_at as string).slice(0, 10);
    const point = trendMap.get(d);
    if (point) {
      point.total++;
      if (a.status === "completed") point.completed++;
      if (a.status === "cancelled") point.cancelled++;
      if (a.status === "no_show") point.noShow++;
    }
  }
  const appointmentTrend = [...trendMap.values()];

  // ─── Customer Trend ─────────────────────────────────────────────────────
  const customerTrend: CustomerTrendPoint[] = [];
  // Simplified: group new/returning by date
  for (const d of dateSeries) {
    customerTrend.push({ date: d, newCustomers: 0, returningCustomers: 0 });
  }

  // ─── Top Services ──────────────────────────────────────────────────────
  const serviceMap = new Map<string, TopServiceItem>();
  for (const a of appointments) {
    const sid = a.service_id as string;
    const existing = serviceMap.get(sid);
    if (!existing) {
      serviceMap.set(sid, {
        serviceId: sid,
        serviceName: a.service_name_snapshot as string,
        appointmentCount: 1,
        completedCount: a.status === "completed" ? 1 : 0,
        cancelledCount: a.status === "cancelled" ? 1 : 0,
        completedValue: a.status === "completed" ? Number(a.price ?? 0) : 0,
        currency,
      });
    } else {
      existing.appointmentCount++;
      if (a.status === "completed") {
        existing.completedCount++;
        existing.completedValue += Number(a.price ?? 0);
      }
      if (a.status === "cancelled") existing.cancelledCount++;
    }
  }
  const topServices = [...serviceMap.values()]
    .sort((a, b) => b.appointmentCount - a.appointmentCount)
    .slice(0, 10);

  // ─── Resource Analytics ────────────────────────────────────────────────
  const resourceMap = new Map<string, ResourceAnalyticsItem>();
  for (const a of appointments) {
    const rid = a.resource_id as string;
    const existing = resourceMap.get(rid);
    const dur = Number(a.duration_minutes ?? 0);
    const actualDur = (a.completed_at && a.service_started_at)
      ? Math.round((new Date(a.completed_at as string).getTime() -
        new Date(a.service_started_at as string).getTime()) / 60000)
      : null;

    if (!existing) {
      resourceMap.set(rid, {
        resourceId: rid,
        resourceName: a.resource_name_snapshot as string,
        appointmentCount: 1,
        completedCount: a.status === "completed" ? 1 : 0,
        cancelledCount: a.status === "cancelled" ? 1 : 0,
        noShowCount: a.status === "no_show" ? 1 : 0,
        scheduledMinutes: dur,
        actualMinutes: actualDur,
        utilization: null,
      });
    } else {
      existing.appointmentCount++;
      existing.scheduledMinutes += dur;
      if (a.status === "completed") existing.completedCount++;
      if (a.status === "cancelled") existing.cancelledCount++;
      if (a.status === "no_show") existing.noShowCount++;
      if (actualDur !== null) {
        existing.actualMinutes = (existing.actualMinutes ?? 0) + actualDur;
      }
    }
  }
  const resourceAnalytics = [...resourceMap.values()]
    .sort((a, b) => b.appointmentCount - a.appointmentCount)
    .slice(0, 10);

  // ─── Location Analytics ────────────────────────────────────────────────
  const locationMap = new Map<string, LocationAnalyticsItem>();
  for (const a of appointments) {
    const lid = a.location_id as string;
    const existing = locationMap.get(lid);
    if (!existing) {
      locationMap.set(lid, {
        locationId: lid,
        locationName: a.location_name_snapshot as string,
        appointmentCount: 1,
        completedCount: a.status === "completed" ? 1 : 0,
        cancelledCount: a.status === "cancelled" ? 1 : 0,
        noShowCount: a.status === "no_show" ? 1 : 0,
        completedValue: a.status === "completed" ? Number(a.price ?? 0) : 0,
        currency,
      });
    } else {
      existing.appointmentCount++;
      if (a.status === "completed") {
        existing.completedCount++;
        existing.completedValue += Number(a.price ?? 0);
      }
      if (a.status === "cancelled") existing.cancelledCount++;
      if (a.status === "no_show") existing.noShowCount++;
    }
  }
  const locationAnalytics = [...locationMap.values()]
    .sort((a, b) => b.appointmentCount - a.appointmentCount);

  // ─── Booking Sources ───────────────────────────────────────────────────
  const sourceCount = new Map<string, number>();
  for (const a of appointments) {
    const src = (a.source as string) ?? "unknown";
    sourceCount.set(src, (sourceCount.get(src) ?? 0) + 1);
  }
  const sourceLabels: Record<string, string> = {
    internal: "Internal",
    online: "Online",
    walk_in: "Walk-in",
    phone: "Phone",
    public_booking: "Public Booking",
  };
  const bookingSources: BookingSourceItem[] = [...sourceCount.entries()]
    .map(([source, count]) => ({
      source,
      label: sourceLabels[source] ?? source,
      count,
      percentage: periodTotal > 0 ? count / periodTotal : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ─── Status Breakdown ──────────────────────────────────────────────────
  const statusCount = new Map<string, number>();
  for (const a of appointments) {
    const s = a.status as string;
    statusCount.set(s, (statusCount.get(s) ?? 0) + 1);
  }
  const statusLabels: Record<string, string> = {
    pending: "Pending", confirmed: "Confirmed", checked_in: "Checked In",
    in_progress: "In Progress", completed: "Completed",
    cancelled: "Cancelled", no_show: "No Show",
  };
  const statusBreakdown: StatusBreakdownItem[] = [...statusCount.entries()]
    .map(([status, count]) => ({
      status,
      label: statusLabels[status] ?? status,
      count,
      percentage: periodTotal > 0 ? count / periodTotal : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ─── Assemble DTO ──────────────────────────────────────────────────────
  const summary: DashboardSummary = {
    todayTotal: todaySummary.total,
    todayUpcoming: todaySummary.upcoming,
    todayCompleted: todaySummary.completed,
    todayCancelled: 0,
    todayNoShow: 0,
    todayCheckedIn: todaySummary.checkedIn,
    todayInProgress: todaySummary.inProgress,
    periodTotal, periodCompleted, periodCancelled, periodNoShow,
    periodBookedValue, periodCompletedValue,
    periodNewCustomers, periodReturningCustomers,
    cancellationRate, noShowRate, completionRate, averageAppointmentValue,
    comparison, currency,
  };

  return {
    summary, appointmentTrend, customerTrend, topServices,
    resourceAnalytics, locationAnalytics, bookingSources, statusBreakdown,
    period: filters.period, dateRange, filters,
  };
}
