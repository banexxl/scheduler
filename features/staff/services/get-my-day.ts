import "server-only";

/**
 * Get My Day Data — Milestone 12.4.
 *
 * Resolves staff identity server-side, loads today's operational data.
 * No N+1 — bounded queries for appointments, working hours, time off.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { getTenantToday } from "@/lib/scheduling/calendar-utils";
import { calculateDayGaps, timeToMinutes, minutesToTime } from "../utils/calculate-day-gaps";
import type { MyDayDTO, MyDayAppointmentDTO, MyDayGapDTO, MyDaySummary } from "../types/my-day";
import type { AppointmentStatus } from "@/features/appointments/types/appointment";

export async function getMyDayData(
  tenantId: string,
  tenantSlug: string,
  membershipId: string
): Promise<MyDayDTO | null> {
  const supabase = createServiceRoleClient();

  // 1. Resolve staff profile + resource
  const { data: profileRow } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .from("staff_profiles" as never)
    .select("id, resource_id, display_name, job_title, avatar_url" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("tenant_member_id" as never, membershipId)
    .eq("is_active" as never, true)
    .maybeSingle();

  if (!profileRow) return null;

  const profile = profileRow as unknown as {
    id: string; resource_id: string; display_name: string;
    job_title: string | null; avatar_url: string | null;
  };

  // 2. Resolve tenant timezone
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("default_timezone")
    .eq("id", tenantId)
    .single();

  const timezone = tenantRow?.default_timezone ?? "UTC";
  const today = getTenantToday(new Date(), timezone);
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  // 3. Load today's appointments (bounded)
  const { data: apptRows } = await supabase
    .from("appointments")
    .select("id, appointment_number, starts_at, ends_at, status, service_name_snapshot, location_name_snapshot, customer_name, customer_phone, customer_email, customer_notes, duration_minutes")
    .eq("tenant_id", tenantId)
    .eq("resource_id", profile.resource_id)
    .gte("starts_at", todayStart)
    .lt("starts_at", todayEnd)
    .order("starts_at", { ascending: true })
    .limit(200);

  const appointments = (apptRows ?? []) as Array<Record<string, unknown>>;

  // 4. Load working hours for today's weekday
  const dayOfWeek = new Date().getDay() || 7; // ISO: 1=Mon, 7=Sun
  const { data: hoursRows } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .from("resource_working_hours" as never)
    .select("start_time, end_time" as never)
    .eq("resource_id" as never, profile.resource_id)
    .eq("day_of_week" as never, dayOfWeek);

  const workingHours = ((hoursRows ?? []) as unknown as Array<{ start_time: string; end_time: string }>)
    .map(h => ({ startTime: h.start_time, endTime: h.end_time }));

  // 5. Load active time off
  const now = new Date().toISOString();
  const { data: timeOffRows } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .from("resource_time_off" as never)
    .select("starts_at, ends_at" as never)
    .eq("resource_id" as never, profile.resource_id)
    .lte("starts_at" as never, todayEnd)
    .gte("ends_at" as never, todayStart)
    .limit(5);

  const timeOffList = (timeOffRows ?? []) as unknown as Array<{ starts_at: string; ends_at: string }>;
  const activeTimeOff = timeOffList.some(t => t.starts_at <= now && t.ends_at > now);

  // 6. Compute summary
  const summary: MyDaySummary = {
    total: appointments.length,
    upcoming: appointments.filter(a => ["pending", "confirmed"].includes(a.status as string)).length,
    checkedIn: appointments.filter(a => a.status === "checked_in").length,
    inProgress: appointments.filter(a => a.status === "in_progress").length,
    completed: appointments.filter(a => a.status === "completed").length,
    cancelled: appointments.filter(a => a.status === "cancelled").length,
    noShow: appointments.filter(a => a.status === "no_show").length,
  };

  // 7. Next appointment
  const upcomingAppts = appointments.filter(a =>
    ["pending", "confirmed", "checked_in", "in_progress"].includes(a.status as string) &&
    (a.starts_at as string) >= now
  );
  const nextAppt = upcomingAppts[0] ?? null;

  // 8. Map appointments to DTO
  const appointmentDTOs: MyDayAppointmentDTO[] = appointments
    .filter(a => a.status !== "cancelled")
    .map((a): MyDayAppointmentDTO => ({
      id: a.id as string,
      appointmentNumber: a.appointment_number as string,
      startsAt: a.starts_at as string,
      endsAt: a.ends_at as string,
      status: a.status as AppointmentStatus,
      operationalState: resolveOperationalState(a.status as string, a.starts_at as string),
      serviceName: a.service_name_snapshot as string,
      locationName: a.location_name_snapshot as string,
      customer: {
        name: a.customer_name as string,
        phone: (a.customer_phone as string) ?? null,
        email: (a.customer_email as string) ?? null,
      },
      notesPreview: a.customer_notes ? (a.customer_notes as string).slice(0, 100) : null,
      paymentStatus: null, // Payment status loaded separately if needed
      canCheckIn: a.status === "confirmed" || a.status === "pending",
      canStart: a.status === "checked_in",
      canComplete: a.status === "in_progress",
      canNoShow: ["pending", "confirmed"].includes(a.status as string),
      canCancel: ["pending", "confirmed"].includes(a.status as string),
    }));

  // 9. Calculate gaps
  const workingPeriods = workingHours.map(h => ({
    start: timeToMinutes(h.startTime),
    end: timeToMinutes(h.endTime),
  }));

  const blockedRanges = appointments
    .filter(a => a.status !== "cancelled")
    .map(a => {
      const startMin = parseInt((a.starts_at as string).slice(11, 13), 10) * 60 +
        parseInt((a.starts_at as string).slice(14, 16), 10);
      const endMin = parseInt((a.ends_at as string).slice(11, 13), 10) * 60 +
        parseInt((a.ends_at as string).slice(14, 16), 10);
      return { start: startMin, end: endMin };
    });

  // Add time off to blocked ranges
  for (const to of timeOffList) {
    const toStart = parseInt(to.starts_at.slice(11, 13), 10) * 60 + parseInt(to.starts_at.slice(14, 16), 10);
    const toEnd = parseInt(to.ends_at.slice(11, 13), 10) * 60 + parseInt(to.ends_at.slice(14, 16), 10);
    blockedRanges.push({ start: toStart, end: toEnd || 24 * 60 });
  }

  const rawGaps = calculateDayGaps(workingPeriods, blockedRanges);
  const gaps: MyDayGapDTO[] = rawGaps.map(g => ({
    startTime: minutesToTime(g.start),
    endTime: minutesToTime(g.end),
    durationMinutes: g.end - g.start,
  }));

  return {
    tenantSlug,
    staff: {
      staffProfileId: profile.id,
      resourceId: profile.resource_id,
      displayName: profile.display_name,
      jobTitle: profile.job_title,
      avatarUrl: profile.avatar_url,
    },
    date: today,
    timezone,
    workingHours,
    timeOff: {
      active: activeTimeOff,
      startsAt: timeOffList[0]?.starts_at ?? null,
      endsAt: timeOffList[0]?.ends_at ?? null,
    },
    summary,
    nextAppointment: nextAppt ? appointmentDTOs.find(a => a.id === (nextAppt.id as string)) ?? null : null,
    appointments: appointmentDTOs,
    gaps,
  };
}

function resolveOperationalState(status: string, startsAt: string): string {
  if (status === "in_progress") return "in_progress";
  if (status === "checked_in") return "checked_in";
  if (status === "completed") return "completed";
  if (status === "no_show") return "no_show";
  if (["pending", "confirmed"].includes(status)) {
    const start = new Date(startsAt).getTime();
    const now = Date.now();
    if (start <= now) return "late";
    if (start - now < 15 * 60_000) return "starting_soon";
    return "upcoming";
  }
  return status;
}
