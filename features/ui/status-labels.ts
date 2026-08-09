/**
 * Centralized Status Display Labels — Milestone 12.7.
 *
 * Single source of truth for all human-readable status labels.
 * Used across business, customer, and public surfaces.
 */

// ─── Appointment Status ──────────────────────────────────────────────────────

export const APPOINTMENT_STATUS_DISPLAY: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export function formatAppointmentStatus(status: string): string {
  return APPOINTMENT_STATUS_DISPLAY[status] ?? status;
}

// ─── Payment Status ──────────────────────────────────────────────────────────

export const PAYMENT_STATUS_DISPLAY: Record<string, string> = {
  not_required: "Pay at business",
  unpaid: "Payment required",
  pending: "Payment pending",
  partially_paid: "Partially paid",
  paid: "Paid",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  failed: "Payment failed",
  cancelled: "Payment cancelled",
};

export function formatPaymentStatus(status: string): string {
  return PAYMENT_STATUS_DISPLAY[status] ?? status;
}

// ─── Operational State ───────────────────────────────────────────────────────

export const OPERATIONAL_STATE_DISPLAY: Record<string, string> = {
  upcoming: "Upcoming",
  starting_soon: "Starting soon",
  late: "Late",
  checked_in: "Checked in",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export function formatOperationalState(state: string): string {
  return OPERATIONAL_STATE_DISPLAY[state] ?? state;
}

// ─── Notification Severity ───────────────────────────────────────────────────

export const NOTIFICATION_SEVERITY_DISPLAY: Record<string, string> = {
  info: "Info",
  attention: "Attention",
  warning: "Warning",
  critical: "Critical",
};

export function formatNotificationSeverity(severity: string): string {
  return NOTIFICATION_SEVERITY_DISPLAY[severity] ?? severity;
}

// ─── Health Status ───────────────────────────────────────────────────────────

export const HEALTH_STATUS_DISPLAY: Record<string, string> = {
  ready: "Ready",
  needs_attention: "Needs attention",
  blocked: "Blocked",
  optional: "Optional",
};

export function formatHealthStatus(status: string): string {
  return HEALTH_STATUS_DISPLAY[status] ?? status;
}
