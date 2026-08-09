/**
 * Payment Intent Types — Milestone 11.1.
 *
 * Represents individual payment attempts. Provider-neutral.
 */

// ─── Intent Statuses ─────────────────────────────────────────────────────────

export const PAYMENT_INTENT_STATUSES = [
  "creating",
  "open",
  "processing",
  "succeeded",
  "failed",
  "expired",
  "cancelled",
] as const;

export type PaymentIntentStatus = typeof PAYMENT_INTENT_STATUSES[number];

// ─── Payment Intent Record ───────────────────────────────────────────────────

export type PaymentIntent = {
  id: string;
  tenantId: string;
  appointmentId: string;
  appointmentPaymentId: string;
  provider: string;
  status: PaymentIntentStatus;
  amount: number;
  currency: string;
  requestKey: string;
  providerCheckoutId: string | null;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  checkoutUrl: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

// ─── Create Intent Input ─────────────────────────────────────────────────────

export type CreatePaymentIntentInput = {
  tenantId: string;
  appointmentId: string;
  appointmentPaymentId: string;
  provider: string;
  amount: number;
  currency: string;
  requestKey: string;
};

// ─── Create Intent Result ────────────────────────────────────────────────────

export type CreatePaymentIntentResult =
  | { success: true; intentId: string; status: "creating"; amount: number; currency: string }
  | { success: false; error: string; code: string };
