import "server-only";

/**
 * Analytics Export Service — Milestone 15.9.
 *
 * Generates CSV exports from server-side queries.
 * Browser never submits authoritative data.
 * Row count bounded by MAX_EXPORT_ROWS.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveAdvancedDateRange } from "./advanced-date-ranges";
import { MAX_EXPORT_ROWS } from "../types/advanced-analytics";
import type { AdvancedAnalyticsFilters, AnalyticsReportType } from "../types/advanced-analytics";

// ─── CSV Generation ──────────────────────────────────────────────────────────

function escapeCsvValue(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvValue(row[h])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

// ─── Export Appointment Data ─────────────────────────────────────────────────

export async function exportAppointments(
  tenantId: string,
  timeZone: string,
  filters: AdvancedAnalyticsFilters
): Promise<{ csv: string; filename: string; rowCount: number }> {
  const supabase = createServiceRoleClient();
  const range = resolveAdvancedDateRange(filters.period, new Date(), timeZone, filters.customStart, filters.customEnd);

  let query = supabase
    .from("appointments")
    .select("appointment_number, customer_name, service_name_snapshot, resource_name_snapshot, location_name_snapshot, status, starts_at, ends_at, price, currency, source")
    .eq("tenant_id", tenantId)
    .gte("starts_at", range.start)
    .lt("starts_at", range.end)
    .order("starts_at", { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  if (filters.locationId) query = query.eq("location_id", filters.locationId);
  if (filters.resourceId) query = query.eq("resource_id", filters.resourceId);
  if (filters.serviceId) query = query.eq("service_id", filters.serviceId);

  const { data } = await query;
  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const headers = ["appointment_number", "customer_name", "service_name_snapshot", "resource_name_snapshot", "location_name_snapshot", "status", "starts_at", "ends_at", "price", "currency", "source"];
  const csv = toCsv(headers, rows);
  const filename = `appointments_${range.label.replace(/\s/g, "_").toLowerCase()}.csv`;

  return { csv, filename, rowCount: rows.length };
}

// ─── Export Customer Data ────────────────────────────────────────────────────

export async function exportCustomers(
  tenantId: string
): Promise<{ csv: string; filename: string; rowCount: number }> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("tenant_customers")
    .select("name, email, phone_number, marketing_opt_in, created_at")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .limit(MAX_EXPORT_ROWS);

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const headers = ["name", "email", "phone_number", "marketing_opt_in", "created_at"];
  const csv = toCsv(headers, rows);

  return { csv, filename: "customers.csv", rowCount: rows.length };
}

// ─── Export Financial Data ───────────────────────────────────────────────────

export async function exportFinancial(
  tenantId: string,
  timeZone: string,
  filters: AdvancedAnalyticsFilters
): Promise<{ csv: string; filename: string; rowCount: number }> {
  const supabase = createServiceRoleClient();
  const range = resolveAdvancedDateRange(filters.period, new Date(), timeZone, filters.customStart, filters.customEnd);

  const { data } = await supabase
    .from("appointment_payments" as never)
    .select("id, status, currency, amount_total, amount_paid, amount_refunded, paid_at, created_at" as never)
    .eq("tenant_id" as never, tenantId)
    .gte("created_at" as never, range.start)
    .lt("created_at" as never, range.end)
    .order("created_at" as never, { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;

  const headers = ["id", "status", "currency", "amount_total", "amount_paid", "amount_refunded", "paid_at", "created_at"];
  const csv = toCsv(headers, rows);
  const filename = `financial_${range.label.replace(/\s/g, "_").toLowerCase()}.csv`;

  return { csv, filename, rowCount: rows.length };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export async function generateExport(
  tenantId: string,
  timeZone: string,
  reportType: AnalyticsReportType,
  filters: AdvancedAnalyticsFilters
): Promise<{ csv: string; filename: string; rowCount: number }> {
  switch (reportType) {
    case "appointments":
    case "services":
    case "staff":
    case "locations":
    case "overview":
      return exportAppointments(tenantId, timeZone, filters);
    case "customers":
      return exportCustomers(tenantId);
    case "finance":
      return exportFinancial(tenantId, timeZone, filters);
    case "marketing":
      return exportAppointments(tenantId, timeZone, filters); // Placeholder
    default:
      return exportAppointments(tenantId, timeZone, filters);
  }
}
