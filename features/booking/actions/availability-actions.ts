"use server";

/**
 * Availability Server Actions — Milestone 17.1.
 *
 * Wraps the existing calculateAvailability engine for the
 * multi-page booking flow. Handles multi-service scenarios
 * by using the first service's parameters (simplification for now).
 */

import { calculateAvailability } from "@/features/availability/services/calculate-availability";
import { loadTenantTimezone } from "@/features/availability/services/availability-queries";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { AvailabilitySlot } from "@/features/availability/types/availability";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AvailableDaysResult = {
  success: true;
  days: string[]; // YYYY-MM-DD dates that have availability
  timeZone: string;
} | {
  success: false;
  error: string;
};

export type AvailableTimeSlotsResult = {
  success: true;
  slots: SimplifiedSlot[];
  timeZone: string;
} | {
  success: false;
  error: string;
};

export type SimplifiedSlot = {
  startsAt: string;
  endsAt: string;
  localStartTime: string;
  localEndTime: string;
  resourceId: string;
  durationMinutes: number;
};

// ─── Get Available Days ──────────────────────────────────────────────────────

/**
 * Returns dates within a month that have at least one available slot.
 * Checks each day in the month by running the availability engine.
 */
export async function getAvailableDays(
  tenantId: string,
  locationId: string,
  serviceIds: string[],
  staffResourceId: string | null,
  yearMonth: string // "YYYY-MM"
): Promise<AvailableDaysResult> {
  if (serviceIds.length === 0) return { success: false, error: "No services selected." };

  const tenant = await loadTenantTimezone(tenantId);
  if (!tenant) return { success: false, error: "Tenant not found." };
  const timeZone = tenant.defaultTimezone;

  const now = new Date();
  const todayStr = format(toZonedTime(now, timeZone), "yyyy-MM-dd");

  // Parse year/month
  const [year, month] = yearMonth.split("-").map(Number) as [number, number];
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Use the first service for availability calculation
  const primaryServiceId = serviceIds[0]!;
  const availableDays: string[] = [];

  // Check each day (parallelized in batches of 7)
  for (let batchStart = 0; batchStart < daysInMonth; batchStart += 7) {
    const batchPromises: Promise<void>[] = [];
    for (let d = batchStart; d < Math.min(batchStart + 7, daysInMonth); d++) {
      const dateStr = format(addDays(firstDay, d), "yyyy-MM-dd");

      // Skip past dates
      if (dateStr < todayStr) continue;

      batchPromises.push(
        calculateAvailability({
          tenantId,
          serviceId: primaryServiceId,
          locationId,
          resourceId: staffResourceId ?? undefined,
          localDate: dateStr,
        }, now).then((result) => {
          if (result.totalSlots > 0) {
            availableDays.push(dateStr);
          }
        }).catch(() => {
          // Skip days that error
        })
      );
    }
    await Promise.all(batchPromises);
  }

  availableDays.sort();

  return { success: true, days: availableDays, timeZone };
}

// ─── Get Available Time Slots ────────────────────────────────────────────────

/**
 * Returns available time slots for a specific date.
 * Merges slots across resources when staffId is null (Any Available).
 */
export async function getAvailableTimeSlots(
  tenantId: string,
  locationId: string,
  serviceIds: string[],
  staffResourceId: string | null,
  localDate: string
): Promise<AvailableTimeSlotsResult> {
  if (serviceIds.length === 0) return { success: false, error: "No services selected." };

  const primaryServiceId = serviceIds[0]!;
  const now = new Date();

  const result = await calculateAvailability({
    tenantId,
    serviceId: primaryServiceId,
    locationId,
    resourceId: staffResourceId ?? undefined,
    localDate,
    slotIntervalMinutes: 30,
  }, now);

  // Merge slots across all resources, de-duplicating by start time
  const slotMap = new Map<string, SimplifiedSlot>();

  for (const resource of result.resources) {
    for (const slot of resource.slots) {
      const key = slot.localStartTime;
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          localStartTime: slot.localStartTime,
          localEndTime: slot.localEndTime,
          resourceId: slot.resourceId,
          durationMinutes: slot.durationMinutes,
        });
      }
    }
  }

  const slots = [...slotMap.values()].sort((a, b) =>
    a.localStartTime.localeCompare(b.localStartTime)
  );

  return { success: true, slots, timeZone: result.timeZone };
}

// ─── Validate Selected Slot ──────────────────────────────────────────────────

/**
 * Validates that a previously selected slot is still available.
 * Returns the slot if valid, or null if it's been taken.
 */
export async function validateSelectedSlot(
  tenantId: string,
  locationId: string,
  serviceId: string,
  resourceId: string,
  localDate: string,
  startsAt: string
): Promise<{ valid: boolean; slot: AvailabilitySlot | null }> {
  const now = new Date();

  const result = await calculateAvailability({
    tenantId,
    serviceId,
    locationId,
    resourceId,
    localDate,
    slotIntervalMinutes: 30,
  }, now);

  for (const resource of result.resources) {
    const match = resource.slots.find(
      (s) => s.startsAt === startsAt && s.resourceId === resourceId
    );
    if (match) return { valid: true, slot: match };
  }

  return { valid: false, slot: null };
}
