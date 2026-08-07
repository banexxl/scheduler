import "server-only";

/**
 * Portal Appointment Queries — Milestone 8.6.
 *
 * Loads tenant-scoped appointment data for a customer email.
 * Returns public-safe DTOs without internal IDs or notes.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { formatInTimeZone } from "date-fns-tz";
import { canCustomerCancelAppointment, canCustomerRescheduleAppointment } from "@/features/booking-rules/utils/cancellation-rescheduling";
import { getResolvedBookingRules } from "@/features/booking-rules/services/get-booking-rules";
import type { CustomerPortalAppointment, CustomerPortalData } from "../types/portal";

// ─── Main Query ──────────────────────────────────────────────────────────────

export async function getCustomerPortalAppointments(
  tenantId: string,
  normalizedEmail: string,
  timeZone: string
): Promise<CustomerPortalData> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointments")
    .select("id, appointment_number, status, starts_at, ends_at, duration_minutes, price, currency, service_id, service_name_snapshot, resource_name_snapshot, location_name_snapshot" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("customer_email" as never, normalizedEmail)
    .order("starts_at" as never, { ascending: false })
    .limit(100);

  if (!data) {
    return { upcoming: [], past: [], cancelled: [] };
  }

  const rows = data as unknown as Array<Record<string, unknown>>;
  const now = new Date();

  // Load booking rules once for cancel/reschedule eligibility
  let defaultRules: { allowCustomerCancellation: boolean; customerCancellationNoticeMinutes: number; allowCustomerRescheduling: boolean; customerRescheduleNoticeMinutes: number } | null = null;
  try {
    const firstServiceId = rows[0]?.service_id as string | undefined;
    if (firstServiceId) {
      const rules = await getResolvedBookingRules(tenantId, firstServiceId);
      defaultRules = {
        allowCustomerCancellation: rules.allowCustomerCancellation,
        customerCancellationNoticeMinutes: rules.customerCancellationNoticeMinutes,
        allowCustomerRescheduling: rules.allowCustomerRescheduling,
        customerRescheduleNoticeMinutes: rules.customerRescheduleNoticeMinutes,
      };
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
      canCancel = canCustomerCancelAppointment(
        { status, startsAt },
        {
          allowCustomerCancellation: defaultRules.allowCustomerCancellation,
          customerCancellationNoticeMinutes: defaultRules.customerCancellationNoticeMinutes,
        },
        now
      );
      canReschedule = canCustomerRescheduleAppointment(
        { status, startsAt },
        {
          allowCustomerRescheduling: defaultRules.allowCustomerRescheduling,
          customerRescheduleNoticeMinutes: defaultRules.customerRescheduleNoticeMinutes,
        },
        now
      );
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
