import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  LocationScheduleException,
  LocationExceptionPeriod,
  LocationExceptionWithPeriods,
  LocationScheduleExceptionType,
} from "../types/location-schedule-exception";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedFrom = { from: (table: string) => any };

type LseRow = {
  id: string;
  tenant_id: string;
  location_id: string;
  exception_date: string;
  exception_type: string;
  title: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type LepRow = {
  id: string;
  tenant_id: string;
  exception_id: string;
  start_time: string;
  end_time: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapException(row: LseRow): LocationScheduleException {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    exceptionDate: row.exception_date,
    exceptionType: row.exception_type as LocationScheduleExceptionType,
    title: row.title,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPeriod(row: LepRow): LocationExceptionPeriod {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    exceptionId: row.exception_id,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get future exceptions for a location (exception_date >= today).
 */
export async function getFutureLocationExceptions(
  tenantId: string,
  locationId: string
): Promise<LocationExceptionWithPeriods[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("location_schedule_exceptions_v2")
    .select("*, location_exception_periods(*)")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .gte("exception_date", today)
    .order("exception_date", { ascending: true });

  if (error) throw new Error("Unable to load location schedule exceptions");

  return ((data ?? []) as (LseRow & { location_exception_periods: LepRow[] })[]).map((row) => ({
    ...mapException(row),
    periods: (row.location_exception_periods ?? []).map(mapPeriod),
  }));
}

/**
 * Get one exception with its periods.
 */
export async function getLocationExceptionById(
  tenantId: string,
  exceptionId: string
): Promise<LocationExceptionWithPeriods | null> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("location_schedule_exceptions_v2")
    .select("*, location_exception_periods(*)")
    .eq("tenant_id", tenantId)
    .eq("id", exceptionId)
    .single();

  if (error || !data) return null;

  const row = data as LseRow & { location_exception_periods: LepRow[] };
  return {
    ...mapException(row),
    periods: (row.location_exception_periods ?? []).map(mapPeriod),
  };
}

/**
 * Get the active exception for a location on a specific date, if one exists.
 */
export async function getLocationExceptionForDate(
  tenantId: string,
  locationId: string,
  date: string
): Promise<LocationExceptionWithPeriods | null> {
  const supabase = await createClient();

  const { data, error } = await (supabase as unknown as UntypedFrom)
    .from("location_schedule_exceptions_v2")
    .select("*, location_exception_periods(*)")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("exception_date", date)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;

  const row = data as LseRow & { location_exception_periods: LepRow[] };
  return {
    ...mapException(row),
    periods: (row.location_exception_periods ?? []).map(mapPeriod),
  };
}
