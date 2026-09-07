import "server-only";

/**
 * Portal Appointment Queries — Milestone 8.6.
 *
 * Loads tenant-scoped appointment data for a customer. Matches by
 * tenant_customers.id (the reliable, identity-based link — set when a
 * booking was made while logged in) OR by exact customer_email (a
 * fallback for older/guest bookings that predate that link).
 * Returns public-safe DTOs without internal IDs or notes.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { formatInTimeZone } from "date-fns-tz";
import { canCustomerCancelAppointment, canCustomerRescheduleAppointment } from "@/features/booking-rules/utils/cancellation-rescheduling";
import { getResolvedBookingRules } from "@/features/booking-rules/services/get-booking-rules";
import type { CustomerPortalAppointment, CustomerPortalData } from "../types/portal";

// ─── Main Query ──────────────────────────────────────────────────────────────

const APPOINTMENT_COLUMNS = "id, appointment_number, status, starts_at, ends_at, duration_minutes, price, currency, service_id, service_name_snapshot, resource_name_snapshot, location_name_snapshot";

export async function getCustomerPortalAppointments(
  tenantId: string,
  normalizedEmail: string,
  timeZone: string,
  customerId?: string | null
): Promise<CustomerPortalData> {
  const supabase = createAdminClient();

  // Two separate, parameterized queries merged by id — safer than building a
  // raw PostgREST .or() filter string out of a user-supplied email.
  const [byEmail, byCustomerId] = await Promise.all([
    (supabase as never as ReturnType<typeof createAdminClient>)
      .from("appointments")
      .select(APPOINTMENT_COLUMNS as never)
      .eq("tenant_id" as never, tenantId)
      .eq("customer_email" as never, normalizedEmail)
      .order("starts_at" as never, { ascending: false })
      .limit(100),
    customerId
      ? (supabase as never as ReturnType<typeof createAdminClient>)
        .from("appointments")
        .select(APPOINTMENT_COLUMNS as never)
        .eq("tenant_id" as never, tenantId)
        .eq("customer_id" as never, customerId)
        .order("starts_at" as never, { ascending: false })
        .limit(100)
      : Promise.resolve({ data: null }),
  ]);

  const merged = new Map<string, Record<string, unknown>>();
  for (const row of [...(byEmail.data ?? []), ...(byCustomerId.data ?? [])] as unknown as Array<Record<string, unknown>>) {
    merged.set(row.id as string, row);
  }
  const data = merged.size > 0
    ? [...merged.values()].sort((a, b) => (b.starts_at as string).localeCompare(a.starts_at as string))
    : null;

  if (!data) {
    return { upcoming: [], past: [], cancelled: [] };
  }

  const rows = data as unknown as Array<Record<string, unknown>>;
  const now = new Date();

  // Load booking rules once for cancel/reschedule eligibility
  let defaultRules: Awaited<ReturnType<typeof getResolvedBookingRules>> | null = null;
  try {
    const firstServiceId = rows[0]?.service_id as string | undefined;
    if (firstServiceId) {
      defaultRules = await getResolvedBookingRules(tenantId, firstServiceId);
    }
  } catch {
    // Use conservative defaults
  }

  const upcoming: CustomerPortalAppointment[] = [];
  const past: CustomerPortalAppointment[] = [];
  const cancelled: CustomerPortalAppointment[] = [];

  for (const row of rows) {
    const startsAt = row.starts_at as string;
    const endsAt = row.ends_at as string;
    const status = row.status as string;
    const appointmentStart = new Date(startsAt);

    // Determine cancel/reschedule eligibility
    let canCancel = false;
    let canReschedule = false;

    if (defaultRules && ["pending", "confirmed"].includes(status)) {
      const cancelResult = canCustomerCancelAppointment(defaultRules, startsAt, now);
      canCancel = cancelResult.allowed;
      const rescheduleResult = canCustomerRescheduleAppointment(defaultRules, startsAt, now);
      canReschedule = rescheduleResult.allowed;
    }

    const appointment: CustomerPortalAppointment = {
      appointmentNumber: row.appointment_number as string,
      status,
      serviceName: row.service_name_snapshot as string,
      resourceName: (row.resource_name_snapshot as string) ?? null,
      locationName: row.location_name_snapshot as string,
      startsAt,
      endsAt,
      localDate: formatInTimeZone(startsAt, timeZone, "yyyy-MM-dd"),
      localStartTime: formatInTimeZone(startsAt, timeZone, "HH:mm"),
      localEndTime: formatInTimeZone(endsAt, timeZone, "HH:mm"),
      durationMinutes: row.duration_minutes as number,
      price: String(row.price),
      currency: row.currency as string,
      canCancel,
      canReschedule,
    };

    if (status === "cancelled") {
      cancelled.push(appointment);
    } else if (appointmentStart > now) {
      upcoming.push(appointment);
    } else {
      past.push(appointment);
    }
  }

  // Sort upcoming chronologically (soonest first)
  upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return { upcoming, past, cancelled };
}
