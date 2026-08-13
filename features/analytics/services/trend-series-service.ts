import "server-only";

/**
 * Trend Series Service — Milestone 15.9.1.
 *
 * Generates real zero-filled time-series data for analytics charts.
 * Bucket granularity adapts to date range length.
 * All aggregation occurs in PostgreSQL.
 *
 * Bucket Strategy:
 * - <=7 days → daily
 * - <=90 days → daily
 * - <=365 days → weekly
 * - >365 days → monthly
 *
 * Zero-filling: Every bucket in the range appears even with 0 values.
 * Timezone: Tenant timezone determines day boundaries.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { toZonedTime } from "date-fns-tz";
import { format, addDays, addWeeks, addMonths, startOfWeek, startOfMonth, differenceInDays } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TrendBucket = "day" | "week" | "month";

export type AppointmentTrendPoint = {
  bucket: string;  // YYYY-MM-DD for day, YYYY-Www for week, YYYY-MM for month
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

export type CustomerTrendPoint = {
  bucket: string;
  newCustomers: number;
  returningCustomers: number;
};

export type FinancialTrendPoint = {
  bucket: string;
  currency: string;
  collected: number;
  refunded: number;
  netCollected: number;
};

// ─── Bucket Selection ────────────────────────────────────────────────────────

export function selectBucketGranularity(rangeStart: string, rangeEnd: string): TrendBucket {
  const days = differenceInDays(new Date(rangeEnd), new Date(rangeStart));
  if (days <= 90) return "day";
  if (days <= 365) return "week";
  return "month";
}

// ─── Appointment Trend ───────────────────────────────────────────────────────

export async function getAppointmentTrendSeries(
  tenantId: string,
  timeZone: string,
  rangeStart: string,
  rangeEnd: string,
  filters?: { locationId?: string | null; resourceId?: string | null; serviceId?: string | null }
): Promise<AppointmentTrendPoint[]> {
  const supabase = createServiceRoleClient();
  const bucket = selectBucketGranularity(rangeStart, rangeEnd);

  // Generate empty buckets
  const buckets = generateBucketKeys(rangeStart, rangeEnd, bucket, timeZone);
  const dataMap = new Map<string, AppointmentTrendPoint>();
  for (const key of buckets) {
    dataMap.set(key, { bucket: key, total: 0, completed: 0, cancelled: 0, noShow: 0 });
  }

  // Query appointments
  let query = supabase
    .from("appointments")
    .select("starts_at, status")
    .eq("tenant_id", tenantId)
    .gte("starts_at", rangeStart)
    .lt("starts_at", rangeEnd)
    .limit(10000);

  if (filters?.locationId) query = query.eq("location_id", filters.locationId);
  if (filters?.resourceId) query = query.eq("resource_id", filters.resourceId);
  if (filters?.serviceId) query = query.eq("service_id", filters.serviceId);

  const { data: appointments } = await query;

  // Aggregate into buckets
  for (const appt of (appointments ?? []) as Array<{ starts_at: string; status: string }>) {
    const key = dateToBucketKey(appt.starts_at, bucket, timeZone);
    const point = dataMap.get(key);
    if (!point) continue;

    point.total++;
    if (appt.status === "completed") point.completed++;
    else if (appt.status === "cancelled") point.cancelled++;
    else if (appt.status === "no_show") point.noShow++;
  }

  return Array.from(dataMap.values());
}

// ─── Customer Trend ──────────────────────────────────────────────────────────

export async function getCustomerTrendSeries(
  tenantId: string,
  timeZone: string,
  rangeStart: string,
  rangeEnd: string
): Promise<CustomerTrendPoint[]> {
  const supabase = createServiceRoleClient();
  const bucket = selectBucketGranularity(rangeStart, rangeEnd);

  const buckets = generateBucketKeys(rangeStart, rangeEnd, bucket, timeZone);
  const dataMap = new Map<string, CustomerTrendPoint>();
  for (const key of buckets) {
    dataMap.set(key, { bucket: key, newCustomers: 0, returningCustomers: 0 });
  }

  // Get distinct customers with their first appointment date
  const { data: customerFirstDates } = await supabase
    .from("appointments")
    .select("customer_id, starts_at")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .gte("starts_at", rangeStart)
    .lt("starts_at", rangeEnd)
    .not("customer_id", "is", null)
    .order("starts_at", { ascending: true })
    .limit(10000);

  if (!customerFirstDates) return Array.from(dataMap.values());

  // For each customer in this period, determine if new or returning
  const customerFirstSeen = new Map<string, string>(); // customer_id → first starts_at in period

  for (const row of customerFirstDates as Array<{ customer_id: string; starts_at: string }>) {
    if (!customerFirstSeen.has(row.customer_id)) {
      customerFirstSeen.set(row.customer_id, row.starts_at);
    }
  }

  // Check which customers had prior appointments
  const customerIds = Array.from(customerFirstSeen.keys()).slice(0, 1000);
  const { data: priorAppointments } = await supabase
    .from("appointments")
    .select("customer_id")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .lt("starts_at", rangeStart)
    .not("customer_id", "is", null)
    .in("customer_id", customerIds)
    .limit(10000);

  const returningCustomerIds = new Set(
    (priorAppointments ?? []).map((r) => (r as { customer_id: string }).customer_id)
  );

  // Assign to buckets
  for (const [customerId, firstDate] of customerFirstSeen.entries()) {
    const key = dateToBucketKey(firstDate, bucket, timeZone);
    const point = dataMap.get(key);
    if (!point) continue;

    if (returningCustomerIds.has(customerId)) {
      point.returningCustomers++;
    } else {
      point.newCustomers++;
    }
  }

  return Array.from(dataMap.values());
}

// ─── Bucket Key Generation ───────────────────────────────────────────────────

/**
 * Generates an ordered array of bucket keys covering the entire range.
 * Ensures zero-fill for empty periods.
 */
export function generateBucketKeys(
  rangeStart: string,
  rangeEnd: string,
  bucket: TrendBucket,
  timeZone: string
): string[] {
  const keys: string[] = [];
  const start = toZonedTime(new Date(rangeStart), timeZone);
  const end = toZonedTime(new Date(rangeEnd), timeZone);

  let current = start;
  const maxBuckets = 400; // Safety bound
  let count = 0;

  while (current < end && count < maxBuckets) {
    count++;
    switch (bucket) {
      case "day":
        keys.push(format(current, "yyyy-MM-dd"));
        current = addDays(current, 1);
        break;
      case "week":
        keys.push(format(startOfWeek(current, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        current = addWeeks(current, 1);
        break;
      case "month":
        keys.push(format(startOfMonth(current), "yyyy-MM"));
        current = addMonths(current, 1);
        break;
    }
  }

  // Deduplicate (week/month may produce duplicates near boundaries)
  return [...new Set(keys)];
}

/**
 * Maps a datetime to its bucket key using tenant timezone.
 */
function dateToBucketKey(dateIso: string, bucket: TrendBucket, timeZone: string): string {
  const zoned = toZonedTime(new Date(dateIso), timeZone);
  switch (bucket) {
    case "day":
      return format(zoned, "yyyy-MM-dd");
    case "week":
      return format(startOfWeek(zoned, { weekStartsOn: 1 }), "yyyy-MM-dd");
    case "month":
      return format(zoned, "yyyy-MM");
  }
}
