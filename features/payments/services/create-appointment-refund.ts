import "server-only";

/**
 * Create Appointment Refund — Milestone 11.5.
 *
 * Initiates a refund via Polar API. Does NOT mark refund as succeeded
 * until trusted webhook confirmation.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger, generateOperationId } from "@/lib/logging";
import { getAppointmentPayment } from "./appointment-payment-queries";
import { PolarAppointmentPaymentProvider } from "../providers/polar-appointment-payment-provider";
import type { CreateRefundInput, CreateRefundResult } from "../types/payment-refund";

/**
 * Calculates the maximum refundable amount considering pending refunds.
 */
export async function getRefundableAmount(
  tenantId: string,
  appointmentPaymentId: string
): Promise<{ refundable: number; amountPaid: number; amountRefunded: number; pendingRefunds: number }> {
  const supabase = createAdminClient();

  const { data: payment } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointment_payments" as never)
    .select("amount_paid, amount_refunded" as never)
    .eq("id" as never, appointmentPaymentId)
    .eq("tenant_id" as never, tenantId)
    .single();

  if (!payment) return { refundable: 0, amountPaid: 0, amountRefunded: 0, pendingRefunds: 0 };

  const p = payment as unknown as { amount_paid: number; amount_refunded: number };

  // Sum pending/creating refund amounts
  const { data: pendingRows } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointment_payment_refunds" as never)
    .select("amount" as never)
    .eq("appointment_payment_id" as never, appointmentPaymentId)
    .eq("tenant_id" as never, tenantId)
    .in("status" as never, ["creating", "pending"] as never);

  const pendingRefunds = ((pendingRows ?? []) as unknown as Array<{ amount: number }>)
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const refundable = Math.max(0, Number(p.amount_paid) - Number(p.amount_refunded) - pendingRefunds);

  return {
    refundable,
    amountPaid: Number(p.amount_paid),
    amountRefunded: Number(p.amount_refunded),
    pendingRefunds,
  };
}

/**
 * Creates a refund for an appointment payment via Polar.
 */
export async function createAppointmentRefund(
  input: CreateRefundInput
): Promise<CreateRefundResult> {
  const operationId = generateOperationId();
  const supabase = createAdminClient();

  // Load payment
  const payment = await getAppointmentPayment(input.tenantId, input.appointmentId);
  if (!payment) {
    return { success: false, error: "Payment not found.", code: "NOT_FOUND" };
  }

  if (payment.status === "not_required" || payment.amountPaid === 0) {
    return { success: false, error: "No payment to refund.", code: "NOT_PAID" };
  }

  // Calculate refundable
  const { refundable } = await getRefundableAmount(input.tenantId, payment.id);

  if (input.amount <= 0) {
    return { success: false, error: "Refund amount must be positive.", code: "INVALID_AMOUNT" };
  }

  if (input.amount > refundable) {
    return { success: false, error: `Maximum refundable amount is ${refundable}.`, code: "EXCEEDS_REFUNDABLE" };
  }

  // Get provider order ID for refund target
  const { data: intentRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_intents" as never)
    .select("id, provider_order_id" as never)
    .eq("appointment_payment_id" as never, payment.id)
    .eq("status" as never, "succeeded")
    .order("completed_at" as never, { ascending: false })
    .limit(1)
    .maybeSingle();

  const providerOrderId = intentRow
    ? (intentRow as unknown as { id: string; provider_order_id: string | null }).provider_order_id
    : null;

  if (!providerOrderId) {
    return { success: false, error: "Provider order ID not available. Cannot issue refund.", code: "NO_PROVIDER_ORDER" };
  }

  const paymentIntentId = (intentRow as unknown as { id: string }).id;

  // Create local refund row
  const { data: refundRow, error: insertError } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointment_payment_refunds" as never)
    .insert({
      tenant_id: input.tenantId,
      appointment_id: input.appointmentId,
      appointment_payment_id: payment.id,
      payment_intent_id: paymentIntentId,
      provider: "polar",
      status: "creating",
      origin: "platform",
      amount: input.amount,
      currency: payment.currency,
      reason_code: input.reasonCode,
      reason_note: input.reasonNote?.slice(0, 500) ?? null,
      requested_by: input.requestedBy,
      provider_order_id: providerOrderId,
    } as never)
    .select("id")
    .single();

  if (insertError || !refundRow) {
    return { success: false, error: "Failed to create refund record.", code: "INSERT_FAILED" };
  }

  const refundId = (refundRow as unknown as { id: string }).id;

  // Call Polar refund API
  const provider = new PolarAppointmentPaymentProvider();
  try {
    const result = await provider.createRefund({
      providerOrderId,
      amount: input.amount,
      currency: payment.currency,
      reason: input.reasonCode,
      metadata: {
        refund_id: refundId,
        appointment_payment_id: payment.id,
        tenant_id: input.tenantId,
      },
    });

    // Update local refund with provider ID
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("appointment_payment_refunds" as never)
      .update({
        status: "pending",
        provider_refund_id: result.providerRefundId,
      } as never)
      .eq("id" as never, refundId);

    logger.info("appointment_refund_created", {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      requestId: operationId,
      operation: "refund_created",
    });

    return { success: true, refundId, status: "pending" };
  } catch (error) {
    // Mark failed
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("appointment_payment_refunds" as never)
      .update({
        status: "failed",
        failure_code: "PROVIDER_ERROR",
        failure_message: error instanceof Error ? error.message.slice(0, 200) : "Unknown",
      } as never)
      .eq("id" as never, refundId);

    logger.error("appointment_refund_provider_failed", {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      requestId: operationId,
      errorCategory: "EXTERNAL_PROVIDER",
    }, error);

    return { success: false, error: "Refund could not be started. No refund has been confirmed.", code: "PROVIDER_FAILED" };
  }
}
