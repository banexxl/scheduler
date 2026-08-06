/**
 * A location schedule exception (date-specific override).
 */
export type ScheduleException = {
  id: string;
  locationId: string;
  tenantId: string;
  exceptionDate: string; // YYYY-MM-DD
  name: string;
  isClosed: boolean;
  opensAt: string | null; // HH:mm
  closesAt: string | null; // HH:mm
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Suggested exception names for quick selection.
 */
export const EXCEPTION_NAME_SUGGESTIONS = [
  "Public holiday",
  "Maintenance",
  "Private event",
  "Inventory",
  "Staff training",
  "Special opening hours",
  "Other",
] as const;
