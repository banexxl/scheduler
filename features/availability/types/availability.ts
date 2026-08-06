/**
 * Availability calculation types for Milestone 6.7.
 *
 * These types define the request, result, and reason codes for the
 * internal availability calculation engine.
 *
 * A returned slot means:
 *   Based on current configuration inputs, this service-resource-location
 *   combination has enough uninterrupted operating time.
 *
 * It does NOT mean:
 * - The slot has been reserved.
 * - Appointment conflicts have been checked.
 * - A customer may book without further authorization.
 * - The result will remain valid after it is returned.
 */

// ─── Request ─────────────────────────────────────────────────────────────────

export type AvailabilityRequest = {
  tenantId: string;
  serviceId: string;
  locationId: string;
  /** When provided, calculate for this resource only. When omitted, calculate for all eligible resources. */
  resourceId?: string | null;
  /** Local date in YYYY-MM-DD format (interpreted in tenant timezone) */
  localDate: string;
  /** Slot interval in minutes. Default: 15. Min: 5, Max: 120. */
  slotIntervalMinutes?: number;
};

// ─── Slot ────────────────────────────────────────────────────────────────────

export type AvailabilitySlot = {
  resourceId: string;
  serviceId: string;
  locationId: string;
  localDate: string;

  /** Customer-visible service start (ISO 8601 instant) */
  startsAt: string;
  /** Customer-visible service end (ISO 8601 instant) */
  endsAt: string;

  /** Local start time "HH:mm" in tenant timezone */
  localStartTime: string;
  /** Local end time "HH:mm" in tenant timezone */
  localEndTime: string;

  /** Effective service duration in minutes */
  durationMinutes: number;
  /** Effective buffer before in minutes */
  bufferBeforeMinutes: number;
  /** Effective buffer after in minutes */
  bufferAfterMinutes: number;

  /** Full occupied window start including buffer_before (ISO 8601 instant) */
  occupiedWindowStartsAt: string;
  /** Full occupied window end including buffer_after (ISO 8601 instant) */
  occupiedWindowEndsAt: string;

  /** Effective price as string (avoid floating-point) */
  price: string;
  /** Effective currency code */
  currency: string;

  /** Indicates the source of resolved values */
  source: {
    locationHours: "weekly" | "custom_exception";
    resourceHours: "weekly";
    serviceValues: "base" | "resource_override" | "mixed";
  };
};

// ─── Reason Codes ────────────────────────────────────────────────────────────

export type AvailabilityReasonCode =
  | "SERVICE_INACTIVE"
  | "LOCATION_INACTIVE"
  | "SERVICE_NOT_AT_LOCATION"
  | "NO_ELIGIBLE_RESOURCES"
  | "RESOURCE_INACTIVE"
  | "RESOURCE_NOT_AT_LOCATION"
  | "LOCATION_CLOSED"
  | "NO_RESOURCE_WORKING_HOURS"
  | "FULLY_BLOCKED_BY_TIME_OFF"
  | "FULLY_BLOCKED_BY_APPOINTMENTS"
  | "PERIOD_TOO_SHORT"
  | "DATE_IN_PAST"
  | "NO_SLOTS"
  // Booking rule reason codes (Milestone 6.8)
  | "SAME_DAY_BOOKING_DISABLED"
  | "MINIMUM_NOTICE_NOT_MET"
  | "MAXIMUM_ADVANCE_EXCEEDED"
  | "BOOKING_RULES_INACTIVE";

// ─── Result ──────────────────────────────────────────────────────────────────

export type ResourceAvailabilityResult = {
  resourceId: string;
  resourceName: string;
  slots: AvailabilitySlot[];
  /** Reason code when no slots exist for this resource */
  reasonCode?: AvailabilityReasonCode;
};

export type AvailabilityResult = {
  tenantId: string;
  serviceId: string;
  locationId: string;
  localDate: string;
  timeZone: string;
  /** Grouped results per resource */
  resources: ResourceAvailabilityResult[];
  /** Top-level reason code when no resources or global failures */
  reasonCode?: AvailabilityReasonCode;
  /** Total slot count across all resources */
  totalSlots: number;
  /** Booking rules metadata (Milestone 6.8) */
  bookingRules?: {
    effectiveSlotInterval: number;
    slotIntervalSource: "tenant" | "service" | "default" | "request_override";
    minimumNoticeMinutes: number;
    maximumAdvanceDays: number;
    allowSameDayBooking: boolean;
    removedByRules: {
      past: number;
      sameDayDisabled: number;
      minimumNotice: number;
      maximumAdvance: number;
    };
  };
};

// ─── Trusted Public Reschedule Context ──────────────────────────────────────

export type PublicRescheduleContext = {
  appointmentId: string;
  tenantId: string;
  serviceId: string;
  locationId: string;
};

// ─── Slot Interval ───────────────────────────────────────────────────────────

export const SLOT_INTERVAL_MIN = 5;
export const SLOT_INTERVAL_MAX = 120;
export const SLOT_INTERVAL_DEFAULT = 15;

// ─── Performance Limits ──────────────────────────────────────────────────────

export const MAX_ELIGIBLE_RESOURCES = 50;
export const MAX_SLOTS_PER_RESOURCE = 200;
