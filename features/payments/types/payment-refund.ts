/**
 * Payment Refund Types — Milestone 11.5.
 */

export const REFUND_STATUSES = ["creating", "pending", "succeeded", "failed", "cancelled"] as const;
export type RefundStatus = typeof REFUND_STATUSES[number];

export const REFUND_ORIGINS = ["platform", "provider"] as const;
export type RefundOrigin = typeof REFUND_ORIGINS[number];

export const REFUND_REASON_CODES = [
  "customer_request",
  "appointment_cancelled",
  "service_issue",
  "duplicate_payment",
  "late_payment",
  "other",
] as const;
export type RefundReasonCode = typeof REFUND_REASON_CODES[number];

export type AppointmentPaymentRefund = {
  id: string;
  tenantId: string;
  appointmentId: string;
  appointmentPaymentId: string;
  paymentIntentId: string | null;
  provider: string;
  status: RefundStatus;
  origin: RefundOrigin;
  amount: number;
  currency: string;
  reasonCode: RefundReasonCode | null;
  reasonNote: string | null;
  requestedBy: string | null;
  requestedAt: string;
  providerRefundId: string | null;
  providerOrderId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type CreateRefundInput = {
  tenantId: string;
  appointmentId: string;
  amount: number;
  reasonCode: RefundReasonCode;
  reasonNote?: string | null;
  requestedBy: string;
};

export type CreateRefundResult =
  | { success: true; refundId: string; status: RefundStatus }
  | { success: false; error: string; code: string };

export type RefundListItem = {
  id: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  origin: RefundOrigin;
  reasonCode: string | null;
  completedAt: string | null;
  createdAt: string;
};
