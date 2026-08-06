/**
 * Represents a single day's working hours.
 * day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday
 */
export type WorkingHoursDay = {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string | null; // "HH:mm" format
  closesAt: string | null; // "HH:mm" format
};

/**
 * A full week of working hours (always 7 entries).
 */
export type WorkingHoursWeek = [
  WorkingHoursDay,
  WorkingHoursDay,
  WorkingHoursDay,
  WorkingHoursDay,
  WorkingHoursDay,
  WorkingHoursDay,
  WorkingHoursDay,
];

/**
 * Day names indexed by day_of_week value.
 */
export const DAY_NAMES: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

/**
 * Ordered days for display (Monday first, Sunday last).
 */
export const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;
