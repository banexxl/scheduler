/**
 * Payment Status Resolution — Milestone 11.1.
 *
 * Pure utility that determines the current appointment payment status
 * from financial state and active intent state.
 *
 * No side effects. No database calls. Fully testable.
 */

import type { AppointmentPaymentStatus } from "../types/appointment-payment";
import type { PaymentIntentStatus } from "../types/payment-intent";

export type PaymentStatusInput = {
  paymentRequirement: "none" | "full" | "deposit";
  amountTotal: number;
  amountPaid: number;
  amountRefunded: number;
  activeIntentStatus: PaymentIntentStatus | null;
};

/**
 * Resolves the appointment payment status from current state.
 *
 * Precedence:
 * 1. requirement = none → not_required
 * 2. full refund → refunded
 * 3. partial refund → partially_refunded
 * 4. fully paid → paid
 * 5. partially paid → partially_paid
 * 6. active intent open/processing → pending
 * 7. otherwise → unpaid
 */
export function resolveAppointmentPaymentStatus(
  input: PaymentStatusInput
): AppointmentPaymentStatus {
  const { paymentRequirement, amountTotal, amountPaid, amountRefunded, activeIntentStatus } = input;

  // Not required
  if (paymentRequirement === "none") {
    return "not_required";
  }

  // Refund states (only if any payment was made)
  if (amountPaid > 0 && amountRefunded > 0) {
    if (amountRefunded >= amountPaid) {
      return "refunded";
    }
    return "partially_refunded";
  }

  // Paid
  if (amountPaid > 0 && amountPaid >= amountTotal) {
    return "paid";
  }

  // Partially paid
  if (amountPaid > 0 && amountPaid < amountTotal) {
    return "partially_paid";
  }

  // Pending (active intent in progress)
  if (activeIntentStatus && ["creating", "open", "processing"].includes(activeIntentStatus)) {
    return "pending";
  }

  // Default: unpaid
  return "unpaid";
}
