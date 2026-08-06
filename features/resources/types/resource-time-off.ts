/**
 * Domain types for resource time off.
 *
 * Time off defines date-specific periods when a resource is unavailable.
 * Uses half-open interval: [starts_at, ends_at) — start inclusive, end exclusive.
 *
 * Times are stored as timestamptz. Full-day entries represent tenant-local
 * midnight-to-midnight boundaries.
 */

// ─── Core Row Type ───────────────────────────────────────────────────────────

export type ResourceTimeOff = {
  id: string;
  tenantId: string;
  resourceId: string;
  locationId: string | null;
  title: string | null;
  notes: string | null;
  startsAt: string; // ISO 8601 timestamptz
  endsAt: string;   // ISO 8601 timestamptz
  isAllDay: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ─── Insert / Update ─────────────────────────────────────────────────────────

export type ResourceTimeOffInsert = {
  tenantId: string;
  resourceId: string;
  locationId?: string | null;
  title?: string | null;
  notes?: string | null;
  startsAt: string;
  endsAt: string;
  isAllDay?: boolean;
  isActive?: boolean;
};

export type ResourceTimeOffUpdate = {
  locationId?: string | null;
  title?: string | null;
  notes?: string | null;
  startsAt?: string;
  endsAt?: string;
  isAllDay?: boolean;
  isActive?: boolean;
};

// ─── Input Type (for form/action) ────────────────────────────────────────────

export type ResourceTimeOffInput = {
  resourceId: string;
  locationId?: string | null;
  title?: string | null;
  notes?: string | null;
  startDate: string;  // "YYYY-MM-DD"
  endDate: string;    // "YYYY-MM-DD" (inclusive for full-day)
  startTime?: string | null; // "HH:mm" (null for full-day)
  endTime?: string | null;   // "HH:mm" (null for full-day)
  isAllDay: boolean;
};

// ─── Joined Types ────────────────────────────────────────────────────────────

export type ResourceTimeOffWithLocation = ResourceTimeOff & {
  locationName: string | null;
};

// ─── Validation Constants ────────────────────────────────────────────────────

export const TIME_OFF_TITLE_MAX = 120;
export const TIME_OFF_NOTES_MAX = 2000;
