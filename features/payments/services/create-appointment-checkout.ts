import "server-only";

/**
 * Appointment Checkout Orchestrator — Milestone 11.2.
 *
 * Creates a Polar checkout for an eligible appointment.
 * Does NOT confirm payment — that happens via webhook in 11.3.
 *
 * Flow:
 *   authorize → load appointment → ensure payment → validate eligibility
 *   → check reusable intent → create local intent → call Polar → persist → return URL
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger, generateOperationId } from "@/lib/logging";
import { getAppointmentPayment, getReusablePaymentIntent } from "./appointment-payment-queries";
import { PolarAppointmentPaymentProvider } from "../providers/polar-appointment-payment-provider";

export type CreateAppointmentCheckoutInput = {
  tenantId: string;
  tenantSlug: string;
  appointmentId: string;
  customerEmail: string | null;
  customerName: string | null;
  businessName: string;
};

export type CreateAppointmentCheckoutResult =
  | { success: true; checkoutUrl: string; intentId: string }
  | { success: false; error: string; code: string };

const ELIGIBLE_APPOINTMENT_STATUSES = ["pending", "confirmed"];

/**
 * Creates a Polar checkout for a full-payment appointment.
 *
 * CRITICAL: This does NOT mark the payment as paid.
 * amount_paid stays 0. paid_at stays null.
 * Payment success only occurs via trusted webhook (11.3).
 */
export async function createAppointmentCheckout(
  input: CreateAppointmentCheckoutInput
): Promise<CreateAppointmentCheckoutResult> {
  const operationId = generateOperationId();
  const supabase = createAdminClient();

  // 1. Load appointment
  const { data: apptRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointments" as never)
    .select("id, tenant_id, status, customer_name, customer_email, service_name_snapshot" as never)
    .eq("id" as never, input.appointmentId)
    .eq("tenant_id" as never, input.tenantId)
    .single();

  if (!apptRow) {
    return { success: false, error: "Appointment not found.", code: "NOT_FOUND" };
  }

  const appt = apptRow as unknown as {
    id: string; status: string; customer_name: string;
    customer_email: string | null; service_name_snapshot: string;
  };

  // 2. Check appointment eligibility
  if (!ELIGIBLE_APPOINTMENT_STATUSES.includes(appt.status)) {
    return { success: false, error: "Payment cannot be created for this appointment status.", code: "INELIGIBLE_STATUS" };
  }

  // 3. Load/ensure payment record
  const payment = await getAppointmentPayment(input.tenantId, input.appointmentId);
  if (!payment) {
    return { success: false, error: "Payment record not found.", code: "NO_PAYMENT" };
  }

  // 4. Validate payment requirement
  if (payment.paymentRequirement === "none") {
    return { success: false, error: "Payment is not required for this appointment.", code: "NOT_REQUIRED" };
  }

  // 5. Check already paid
  if (payment.amountPaid >= payment.amountTotal) {
    return { success: false, error: "This appointment is already paid.", code: "ALREADY_PAID" };
  }

  // 6. Calculate amount to pay
  const amountToPay = payment.amountTotal - payment.amountPaid;
  if (amountToPay <= 0) {
    return { success: false, error: "No amount due.", code: "ALREADY_PAID" };
  }

  // 7. Check reusable intent (existing open checkout)
  const reusable = await getReusablePaymentIntent(
    input.tenantId, payment.id, amountToPay, payment.currency
  );
  if (reusable && reusable.checkoutUrl && reusable.status === "open") {
    // Verify not expired
    if (!reusable.expiresAt || new Date(reusable.expiresAt) > new Date()) {
      return { success: true, checkoutUrl: reusable.checkoutUrl, intentId: reusable.id };
    }
  }

  // 8. Create local payment intent
  const requestKey = `appointment:${input.appointmentId}:checkout:${crypto.randomUUID()}`;

  const { data: intentRow, error: insertError } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_intents" as never)
    .insert({
      tenant_id: input.tenantId,
      appointment_id: input.appointmentId,
      appointment_payment_id: payment.id,
      provider: "polar",
      status: "creating",
      amount: amountToPay,
      currency: payment.currency,
      request_key: requestKey,
    } as never)
    .select("id")
    .single();

  if (insertError || !intentRow) {
    logger.error("appointment_checkout_intent_create_failed", {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      requestId: operationId,
    });
    return { success: false, error: "Failed to create payment intent.", code: "INTENT_CREATE_FAILED" };
  }

  const intentId = (intentRow as unknown as { id: string }).id;

  // 9. Build success URL (server-generated, never from client)
  const appUrl = process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const successUrl = `${appUrl}/book/${input.tenantSlug}/payment/return?ref=${intentId}`;

  // 10. Call Polar
  const provider = new PolarAppointmentPaymentProvider();

  try {
    const checkout = await provider.createCheckout({
      paymentIntentId: intentId,
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      amount: amountToPay,
      currency: payment.currency,
      description: `Appointment at ${input.businessName}`,
      customerEmail: input.customerEmail ?? appt.customer_email,
      customerName: input.customerName ?? appt.customer_name,
      successUrl,
      metadata: {
        payment_intent_id: intentId,
        appointment_id: input.appointmentId,
        tenant_id: input.tenantId,
      },
    });

    // 11. Persist checkout result
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("payment_intents" as never)
      .update({
        status: "open",
        provider_checkout_id: checkout.checkoutId,
        checkout_url: checkout.checkoutUrl,
        expires_at: checkout.expiresAt,
      } as never)
      .eq("id" as never, intentId);

    // 12. Update payment summary
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("appointment_payments" as never)
      .update({
        status: "pending",
        provider: "polar",
        latest_payment_intent_id: intentId,
      } as never)
      .eq("id" as never, payment.id);

    return { success: true, checkoutUrl: checkout.checkoutUrl, intentId };
  } catch (error) {
    // Mark intent as failed
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("payment_intents" as never)
      .update({
        status: "failed",
        failure_code: "PROVIDER_ERROR",
        failure_message: error instanceof Error ? error.message.slice(0, 200) : "Unknown",
      } as never)
      .eq("id" as never, intentId);

    logger.error("appointment_checkout_polar_failed", {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      requestId: operationId,
      errorCategory: "EXTERNAL_PROVIDER",
    }, error);

    return { success: false, error: "Unable to start payment. Please try again.", code: "PROVIDER_FAILED" };
  }
}
