/**
 * Appointment Payment Provider Interface — Milestone 11.2.
 *
 * Provider-neutral interface for creating payment checkouts.
 * Isolates domain logic from Polar-specific API calls.
 */

export type CreateCheckoutInput = {
  /** Local payment intent ID (used as idempotency/correlation key) */
  paymentIntentId: string;
  /** Tenant ID for correlation */
  tenantId: string;
  /** Appointment ID for correlation */
  appointmentId: string;
  /** Amount in minor units */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Human-readable description */
  description: string;
  /** Customer email if available */
  customerEmail: string | null;
  /** Customer name if available */
  customerName: string | null;
  /** URL to redirect after successful payment */
  successUrl: string;
  /** Metadata for correlation (only safe IDs) */
  metadata: Record<string, string>;
};

export type CreateCheckoutResult = {
  /** Provider-assigned checkout/session ID */
  checkoutId: string;
  /** URL to redirect customer for payment */
  checkoutUrl: string;
  /** Provider-reported status */
  status: string | null;
  /** When checkout expires (if supported) */
  expiresAt: string | null;
};

export interface AppointmentPaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
}
