import "server-only";

/**
 * Create Local Payment Intent — Milestone 11.1.
 *
 * Creates a local payment intent record. Does NOT call any provider API.
 * Provider checkout integration arrives in 11.2.
 *
 * Flow:
 *   authenticate/authorize → load appointment → ensure payment record
 *   → validate eligibility → check reusable → snapshot → create intent
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getAppointmentPayment, getReusablePaymentIntent } from "./appointment-payment-queries";
import type { CreatePaymentIntentResult } from "../types/payment-intent";
import type { PaymentRequirement } from "../types/appointment-payment";

// ─── Ensure Appointment Payment ──────────────────────────────────────────────

/**
 * Creates the appointment_payments row if it doesn't exist.
 * Snapshots amount/currency from the appointment.
 * Returns the payment record ID.
 */
export async function ensureAppointmentPayment(
  tenantId: string,
  appointmentId: string,
  requirement: PaymentRequirement = "none"
): Promise<{ paymentId: string; amountTotal: number; currency: string } | null> {
  const supabase = createAdminClient();

  // Check existing
  const existing = await getAppointmentPayment(tenantId, appointmentId);
  if (existing) {
    return {
      paymentId: existing.id,
      amountTotal: existing.amountTotal,
      currency: existing.currency,
    };
  }

  // Load appointment for snapshot
  const { data: apptRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointments" as never)
    .select("id, tenant_id, price, currency, status" as never)
    .eq("id" as never, appointmentId)
    .eq("tenant_id" as never, tenantId)
    .single();

  if (!apptRow) return null;

  const appt = apptRow as unknown as { id: string; tenant_id: string; price: string; currency: string; status: string };

  // Snapshot amount from appointment price (stored as numeric string → convert to minor units)
  const priceNumeric = Math.round(Number(appt.price) * 100); // simplified: assumes 2 decimal currency
  const currency = appt.currency?.toUpperCase() ?? "EUR";

  // Insert payment record
  const { data, error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointment_payments" as never)
    .insert({
      tenant_id: tenantId,
      appointment_id: appointmentId,
      status: requirement === "none" ? "not_required" : "unpaid",
      payment_requirement: requirement,
      currency,
      amount_total: priceNumeric,
    } as never)
    .select("id, amount_total, currency")
    .single();

  if (error || !data) return null;

  const row = data as unknown as { id: string; amount_total: number; currency: string };
  return { paymentId: row.id, amountTotal: Number(row.amount_total), currency: row.currency };
}

// ─── Create Local Payment Intent ─────────────────────────────────────────────

/**
 * Creates a local payment intent. No provider API call.
 *
 * Checks:
 * - Payment exists and requires payment
 * - Appointment not cancelled
 * - Not already fully paid
 * - Reuses existing open intent if amount matches
 */
export async function createLocalPaymentIntent(
  tenantId: string,
  appointmentId: string,
  provider: string = "polar"
): Promise<CreatePaymentIntentResult> {
  const supabase = createAdminClient();

  // Load appointment
  const { data: apptRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointments" as never)
    .select("id, status" as never)
    .eq("id" as never, appointmentId)
    .eq("tenant_id" as never, tenantId)
    .single();

  if (!apptRow) {
    return { success: false, error: "Appointment not found.", code: "NOT_FOUND" };
  }

  const appt = apptRow as unknown as { id: string; status: string };

  // Check eligible status
  if (appt.status === "cancelled") {
    return { success: false, error: "Cannot create payment for cancelled appointment.", code: "INELIGIBLE_STATUS" };
  }

  // Get or create payment record
  const payment = await getAppointmentPayment(tenantId, appointmentId);
  if (!payment) {
    return { success: false, error: "Payment record not found.", code: "NO_PAYMENT" };
  }

  // Check requirement
  if (payment.paymentRequirement === "none") {
    return { success: false, error: "Payment is not required for this appointment.", code: "NOT_REQUIRED" };
  }

  // Check already paid
  if (payment.amountPaid >= payment.amountTotal) {
    return { success: false, error: "Appointment is already paid.", code: "ALREADY_PAID" };
  }

  // Check reusable intent
  const reusable = await getReusablePaymentIntent(
    tenantId, payment.id, payment.amountTotal, payment.currency
  );
  if (reusable) {
    return {
      success: true,
      intentId: reusable.id,
      status: "creating",
      amount: reusable.amount,
      currency: reusable.currency,
    };
  }

  // Generate request key
  const requestKey = `appointment:${appointmentId}:payment:${crypto.randomUUID()}`;

  // Create intent
  const { data: intentRow, error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_intents" as never)
    .insert({
      tenant_id: tenantId,
      appointment_id: appointmentId,
      appointment_payment_id: payment.id,
      provider,
      status: "creating",
      amount: payment.amountTotal,
      currency: payment.currency,
      request_key: requestKey,
    } as never)
    .select("id, amount, currency")
    .single();

  if (error || !intentRow) {
    return { success: false, error: "Failed to create payment intent.", code: "CREATE_FAILED" };
  }

  const intent = intentRow as unknown as { id: string; amount: number; currency: string };

  // Update latest intent reference
  await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointment_payments" as never)
    .update({ latest_payment_intent_id: intent.id, status: "pending" } as never)
    .eq("id" as never, payment.id);

  return {
    success: true,
    intentId: intent.id,
    status: "creating",
    amount: Number(intent.amount),
    currency: intent.currency,
  };
}

// ─── Price Snapshot Match Check ──────────────────────────────────────────────

/**
 * Checks if the unpaid payment summary matches the current appointment price.
 * Returns true if amounts match or no mismatch concern.
 */
export async function doesAppointmentPaymentMatchCurrentSnapshot(
  tenantId: string,
  appointmentId: string
): Promise<{ matches: boolean; paymentAmount: number | null; appointmentAmount: number | null }> {
  const supabase = createAdminClient();
  const payment = await getAppointmentPayment(tenantId, appointmentId);

  if (!payment || payment.status === "not_required") {
    return { matches: true, paymentAmount: null, appointmentAmount: null };
  }

  // If already paid, don't consider it a mismatch (requires reconciliation)
  if (payment.amountPaid > 0) {
    return { matches: true, paymentAmount: payment.amountTotal, appointmentAmount: null };
  }

  // Load current appointment price
  const { data: apptRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointments" as never)
    .select("price, currency" as never)
    .eq("id" as never, appointmentId)
    .eq("tenant_id" as never, tenantId)
    .single();

  if (!apptRow) return { matches: true, paymentAmount: null, appointmentAmount: null };

  const appt = apptRow as unknown as { price: string; currency: string };
  const currentAmount = Math.round(Number(appt.price) * 100);

  return {
    matches: payment.amountTotal === currentAmount && payment.currency === appt.currency.toUpperCase(),
    paymentAmount: payment.amountTotal,
    appointmentAmount: currentAmount,
  };
}
