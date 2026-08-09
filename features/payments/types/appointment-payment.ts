/**
 * Appointment Payment Types — Milestone 11.1.
 *
 * Provider-neutral payment domain model for appointments.
 * Separate from SaaS tenant billing (billing_orders, tenant_subscriptions).
 */

// ─── Payment Statuses ────────────────────────────────────────────────────────

export const APPOINTMENT_PAYMENT_STATUSES = [
  "not_required",
  "unpaid",
  "pending",
  "partially_paid",
  "paid",
  "partially_refunded",
  "refunded",
  "failed",
  "cancelled",
] as const;

export type AppointmentPaymentStatus = typeof APPOINTMENT_PAYMENT_STATUSES[number];

// ─── Payment Requirement ─────────────────────────────────────────────────────

export const PAYMENT_REQUIREMENTS = ["none", "full", "deposit"] as const;
export type PaymentRequirement = typeof PAYMENT_REQUIREMENTS[number];

// ─── Payment Provider ────────────────────────────────────────────────────────

export const PAYMENT_PROVIDERS = ["polar", "manual", "external"] as const;
export type PaymentProvider = typeof PAYMENT_PROVIDERS[number];

// ─── Appointment Payment Record ──────────────────────────────────────────────

export type AppointmentPayment = {
  id: string;
  tenantId: string;
  appointmentId: string;
  status: AppointmentPaymentStatus;
  paymentRequirement: PaymentRequirement;
  provider: PaymentProvider | null;
  currency: string;
  amountTotal: number;
  amountPaid: number;
  amountRefunded: number;
  latestPaymentIntentId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Customer-Safe DTO ───────────────────────────────────────────────────────

export type CustomerAppointmentPayment = {
  status: AppointmentPaymentStatus;
  amountTotal: number;
  amountPaid: number;
  amountRefunded: number;
  currency: string;
  paymentRequired: boolean;
};

// ─── Business DTO ────────────────────────────────────────────────────────────

export type BusinessAppointmentPayment = {
  id: string;
  status: AppointmentPaymentStatus;
  paymentRequirement: PaymentRequirement;
  provider: PaymentProvider | null;
  currency: string;
  amountTotal: number;
  amountPaid: number;
  amountRefunded: number;
  latestIntentStatus: string | null;
  paidAt: string | null;
  createdAt: string;
};
