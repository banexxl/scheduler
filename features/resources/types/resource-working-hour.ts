/**
 * Domain types for resource working hours.
 *
 * Working hours define recurring weekly periods when a resource normally works.
 * They do NOT create bookable slots by themselves.
 *
 * Day-of-week convention (ISO): 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
 * Times are in tenant-local wall-clock time (not UTC).
 */

// ─── Constants ───────────────────────────────────────────────────────────────

export const DAY_OF_WEEK = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const;

export type DayOfWeek = (typeof DAY_OF_WEEK)[keyof typeof DAY_OF_WEEK];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

export const ALL_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];

// ─── Core Row Type ───────────────────────────────────────────────────────────

export type ResourceWorkingHour = {
  id: string;
  tenantId: string;
  resourceId: string;
  locationId: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm" format
  endTime: string;   // "HH:mm" format
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Insert / Update ─────────────────────────────────────────────────────────

export type ResourceWorkingHourInsert = {
  tenantId: string;
  resourceId: string;
  locationId?: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type ResourceWorkingHourUpdate = {
  locationId?: string | null;
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
  sortOrder?: number;
};

// ─── Input Type (for RPC payload) ────────────────────────────────────────────

export type ResourceWorkingHourInput = {
  locationId: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
  sortOrder: number;
};

// ─── Joined / Aggregated Types ───────────────────────────────────────────────

export type ResourceWorkingHourWithLocation = ResourceWorkingHour & {
  locationName: string | null;
};

/** Full weekly schedule grouped by day */
export type ResourceWeeklySchedule = {
  resourceId: string;
  resourceName: string;
  periods: ResourceWorkingHourWithLocation[];
};
