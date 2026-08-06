/**
 * Domain types for location recurring business hours.
 *
 * Business hours define when a location normally operates.
 * They do NOT create bookable slots by themselves.
 *
 * Reuses shared scheduling constants from lib/scheduling.
 */

import type { DayOfWeek } from "@/lib/scheduling/scheduling-constants";

// Re-export for convenience
export type { DayOfWeek } from "@/lib/scheduling/scheduling-constants";

// ─── Core Row Type ───────────────────────────────────────────────────────────

export type LocationBusinessHour = {
  id: string;
  tenantId: string;
  locationId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Input Type (for RPC payload) ────────────────────────────────────────────

export type LocationBusinessHourInput = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
  sortOrder: number;
};

// ─── Aggregated Type ─────────────────────────────────────────────────────────

export type LocationWeeklySchedule = {
  locationId: string;
  locationName: string;
  periods: LocationBusinessHour[];
};

// ─── Operating Period (resolved output) ──────────────────────────────────────

export type LocationOperatingPeriod = {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
};
