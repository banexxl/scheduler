/**
 * Domain types for appointments — Milestone 6.9.
 *
 * Defines the appointment data model, status lifecycle, transition rules,
 * blocking semantics, and all input/output shapes used by services, actions,
 * and UI components.
 */

// ─── Appointment Statuses ────────────────────────────────────────────────────

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

// ─── Status Labels ───────────────────────────────────────────────────────────

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

// ─── Blocking Statuses ───────────────────────────────────────────────────────

/**
 * Statuses that occupy scheduling time and block other appointments.
 * Only 'cancelled' is non-blocking.
 */
export const BLOCKING_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "no_show",
];

export const NON_BLOCKING_STATUSES: AppointmentStatus[] = ["cancelled"];

export function isBlockingStatus(status: AppointmentStatus): boolean {
  return status !== "cancelled";
}

// ─── Terminal Statuses ───────────────────────────────────────────────────────

export const TERMINAL_STATUSES: AppointmentStatus[] = [
  "completed",
  "cancelled",
  "no_show",
];

export function isTerminalStatus(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

// ─── Status Transitions ──────────────────────────────────────────────────────

/**
 * Allowed status transitions.
 * Key = current status, Value = array of valid target statuses.
 */
export const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "in_progress", "completed", "cancelled", "no_show"],
  checked_in: ["in_progress", "completed", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

/**
 * Pure utility to check if a status transition is allowed.
 */
export function canTransitionAppointmentStatus(
  currentStatus: AppointmentStatus,
  targetStatus: AppointmentStatus
): { allowed: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { allowed: false, reason: "Status is already the target status" };
  }

  if (isTerminalStatus(currentStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition from terminal status "${currentStatus}"`,
    };
  }

  const allowed = STATUS_TRANSITIONS[currentStatus];
  if (!allowed.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Transition from "${currentStatus}" to "${targetStatus}" is not allowed`,
    };
  }

  return { allowed: true };
}

// ─── Appointment Source ──────────────────────────────────────────────────────

export const APPOINTMENT_SOURCES = [
  "internal",
  "online",
  "walk_in",
  "phone",
] as const;

export type AppointmentSource = (typeof APPOINTMENT_SOURCES)[number];

export const APPOINTMENT_SOURCE_LABELS: Record<AppointmentSource, string> = {
  internal: "Internal",
  online: "Online",
  walk_in: "Walk-in",
  phone: "Phone",
};

// ─── Core Appointment Type ───────────────────────────────────────────────────

export type Appointment = {
  id: string;
  tenantId: string;
  appointmentNumber: string;
  serviceId: string;
  locationId: string;
  resourceId: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: AppointmentStatus;
  source: AppointmentSource;
  startsAt: string;
  endsAt: string;
  occupiedStartsAt: string;
  occupiedEndsAt: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  price: string;
  currency: string;
  serviceNameSnapshot: string;
  locationNameSnapshot: string;
  resourceNameSnapshot: string;
  internalNotes: string | null;
  customerNotes: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── List Item (for table display) ──────────────────────────────────────────

export type AppointmentListItem = {
  id: string;
  tenantId: string;
  appointmentNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: AppointmentStatus;
  source: AppointmentSource;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  price: string;
  currency: string;
  serviceNameSnapshot: string;
  locationNameSnapshot: string;
  resourceNameSnapshot: string;
  serviceId: string;
  locationId: string;
  resourceId: string;
  createdAt: string;
};

// ─── Appointment With Relations ──────────────────────────────────────────────

export type AppointmentWithRelations = Appointment & {
  serviceName?: string;
  locationName?: string;
  resourceName?: string;
  serviceIsActive?: boolean;
  locationIsActive?: boolean;
  resourceIsActive?: boolean;
};

// ─── Creation Input ──────────────────────────────────────────────────────────

export type AppointmentCreateInput = {
  tenantId: string;
  serviceId: string;
  locationId: string;
  resourceId: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  localDate: string;
  localStartTime: string;
  status?: AppointmentStatus;
  source?: AppointmentSource;
  internalNotes?: string | null;
  customerNotes?: string | null;
};

// ─── Update Input ────────────────────────────────────────────────────────────

export type AppointmentUpdateInput = {
  customerName?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
};

// ─── Reschedule Input ────────────────────────────────────────────────────────

export type AppointmentRescheduleInput = {
  serviceId?: string;
  locationId?: string;
  resourceId?: string;
  localDate: string;
  localStartTime: string;
};

// ─── Cancellation Input ──────────────────────────────────────────────────────

export type AppointmentCancellationInput = {
  reason?: string | null;
};

// ─── Status Update Input ─────────────────────────────────────────────────────

export type AppointmentStatusUpdateInput = {
  status: AppointmentStatus;
};

// ─── Conflict Information ────────────────────────────────────────────────────

export type AppointmentConflict = {
  appointmentId: string;
  appointmentNumber: string;
  resourceId: string;
  resourceName: string;
  occupiedStartsAt: string;
  occupiedEndsAt: string;
  status: AppointmentStatus;
};

// ─── Blocking Interval (for availability subtraction) ────────────────────────

export type BlockingAppointmentInterval = {
  appointmentId: string;
  resourceId: string;
  occupiedStartsAt: string;
  occupiedEndsAt: string;
};

// ─── List Filters ────────────────────────────────────────────────────────────

export type AppointmentListFilters = {
  dateFrom?: string;
  dateTo?: string;
  status?: AppointmentStatus | null;
  locationId?: string | null;
  resourceId?: string | null;
  serviceId?: string | null;
  customerSearch?: string | null;
};

// ─── Availability Reason Codes (appointment-specific) ────────────────────────

export type AppointmentReasonCode =
  | "FULLY_BLOCKED_BY_APPOINTMENTS"
  | "APPOINTMENT_CONFLICT"
  | "SLOT_NO_LONGER_AVAILABLE";

// ─── Constants ───────────────────────────────────────────────────────────────

export const APPOINTMENT_NUMBER_PREFIX = "APT";
export const MAX_INTERNAL_NOTES_LENGTH = 5000;
export const MAX_CUSTOMER_NOTES_LENGTH = 2000;
export const MAX_CANCELLATION_REASON_LENGTH = 1000;
export const MAX_CUSTOMER_NAME_LENGTH = 160;
export const MIN_CUSTOMER_NAME_LENGTH = 1;
export const MAX_CUSTOMER_EMAIL_LENGTH = 254;
export const MIN_CUSTOMER_EMAIL_LENGTH = 5;
export const MAX_CUSTOMER_PHONE_LENGTH = 30;
export const MIN_CUSTOMER_PHONE_LENGTH = 3;
