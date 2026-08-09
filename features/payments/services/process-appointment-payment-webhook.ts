import "server-only";

/**
 * Appointment Payment Webhook Processor — Milestone 11.3.
 *
 * Handles Polar webhook events that correlate to appointment payments.
 * Routing: if event metadata contains `payment_intent_id`, it's an appointment event.
 *
 * CRITICAL: Only `order.paid` marks payment as succeeded.
 * All other events are projections/status updates only.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging";

type WebhookPayload = Record<string, unknown>;

export type AppointmentPaymentWebhookResult =
  | { status: "applied"; paymentIntentId: string }
  | { status: "already_applied"; paymentIntentId: string }
  | { status: "expired"; paymentIntentId: string }
  | { status: "projection_updated"; paymentIntentId: string }
  | { status: "not_appointment_event" }
  | { status: "failed"; reason: string };

// ─── Domain Tag Detection ────────────────────────────────────────────────────

/**
 * Determines if a webhook event is an appointment payment event.
 * Checks for payment_intent_id in metadata.
 */
export function isAppointmentPaymentEvent(payload: WebhookPayload): boolean {
  const data = extractData(payload);
  const metadata = extractMetadata(data);
  return Boolean(metadata.payment_intent_id);
}

// ─── Main Processor ──────────────────────────────────────────────────────────

export async function processAppointmentPaymentWebhook(
  eventType: string,
  payload: WebhookPayload,
  providerEventId: string
): Promise<AppointmentPaymentWebhookResult> {
  const data = extractData(payload);
  const metadata = extractMetadata(data);
  const paymentIntentId = String(metadata.payment_intent_id ?? "");

  if (!paymentIntentId) {
    return { status: "not_appointment_event" };
  }

  const ctx = { paymentIntentId, eventType, providerEventId };

  switch (eventType) {
    case "order.paid":
      return handleOrderPaid(data, paymentIntentId, ctx);
    case "order.created":
    case "order.updated":
      return handleOrderProjection(data, paymentIntentId, ctx);
    case "checkout.expired":
      return handleCheckoutExpired(paymentIntentId, ctx);
    case "checkout.updated":
      return handleCheckoutUpdated(data, paymentIntentId, ctx);
    case "order.refunded":
    case "refund.created":
    case "refund.updated":
      // Persist safely but do not process refunds yet (11.5)
      logger.info("appointment_payment_refund_event_received", ctx);
      return { status: "projection_updated", paymentIntentId };
    default:
      return { status: "not_appointment_event" };
  }
}

// ─── order.paid — AUTHORITATIVE SUCCESS ──────────────────────────────────────

async function handleOrderPaid(
  data: WebhookPayload,
  paymentIntentId: string,
  ctx: Record<string, string>
): Promise<AppointmentPaymentWebhookResult> {
  const supabase = createAdminClient();

  const providerOrderId = String(data.id ?? data.order_id ?? "");
  const providerPaymentId = String(data.payment_id ?? "");
  const paidAmount = extractAmount(data);
  const paidCurrency = extractCurrency(data);

  // Verify checkout correlation if available
  const checkoutId = String(data.checkout_id ?? "");
  if (checkoutId) {
    const { data: intentRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("payment_intents" as never)
      .select("provider_checkout_id" as never)
      .eq("id" as never, paymentIntentId)
      .single();

    if (intentRow) {
      const intent = intentRow as unknown as { provider_checkout_id: string | null };
      if (intent.provider_checkout_id && intent.provider_checkout_id !== checkoutId) {
        logger.warn("appointment_payment_checkout_mismatch", {
          ...ctx,
          errorCategory: "CONFLICT",
        });
        return { status: "failed", reason: "Checkout ID mismatch" };
      }
    }
  }

  // Call transactional RPC
  const { data: result } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .rpc("apply_appointment_payment_order_paid" as never, {
      p_payment_intent_id: paymentIntentId,
      p_provider_order_id: providerOrderId || null,
      p_provider_payment_id: providerPaymentId || null,
      p_provider_event_id: ctx.providerEventId || null,
      p_paid_amount: paidAmount,
      p_paid_currency: paidCurrency,
    } as never);

  const rpcResult = (result as unknown as Record<string, unknown>) ?? {};
  const status = String(rpcResult.status ?? "failed");

  if (status === "applied") {
    logger.info("appointment_payment_confirmed", {
      ...ctx,
      operation: "order_paid",
    });
    return { status: "applied", paymentIntentId };
  }

  if (status === "already_applied") {
    logger.info("appointment_payment_duplicate_ignored", ctx);
    return { status: "already_applied", paymentIntentId };
  }

  // Mismatch or error
  logger.warn("appointment_payment_order_paid_rejected", {
    ...ctx,
    errorCategory: status,
  });
  return { status: "failed", reason: `RPC returned: ${status}` };
}

// ─── order.created / order.updated — Projection Only ─────────────────────────

async function handleOrderProjection(
  data: WebhookPayload,
  paymentIntentId: string,
  ctx: Record<string, string>
): Promise<AppointmentPaymentWebhookResult> {
  const supabase = createAdminClient();
  const providerOrderId = String(data.id ?? data.order_id ?? "");

  if (providerOrderId) {
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("payment_intents" as never)
      .update({ provider_order_id: providerOrderId } as never)
      .eq("id" as never, paymentIntentId)
      .in("status" as never, ["creating", "open", "processing"] as never);
  }

  logger.info("appointment_payment_order_projection", ctx);
  return { status: "projection_updated", paymentIntentId };
}

// ─── checkout.expired ────────────────────────────────────────────────────────

async function handleCheckoutExpired(
  paymentIntentId: string,
  ctx: Record<string, string>
): Promise<AppointmentPaymentWebhookResult> {
  const supabase = createAdminClient();

  const { data: result } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .rpc("expire_appointment_payment_intent" as never, {
      p_payment_intent_id: paymentIntentId,
    } as never);

  const rpcResult = (result as unknown as Record<string, unknown>) ?? {};
  const status = String(rpcResult.status ?? "");

  if (status === "already_terminal") {
    // Intent already succeeded/failed — expiry cannot revert it
    logger.info("appointment_payment_expiry_ignored_terminal", ctx);
    return { status: "already_applied", paymentIntentId };
  }

  logger.info("appointment_payment_intent_expired", ctx);
  return { status: "expired", paymentIntentId };
}

// ─── checkout.updated — Projection Only ──────────────────────────────────────

async function handleCheckoutUpdated(
  data: WebhookPayload,
  paymentIntentId: string,
  ctx: Record<string, string>
): Promise<AppointmentPaymentWebhookResult> {
  const supabase = createAdminClient();
  const providerStatus = String(data.status ?? "");

  // Only update intent if it's still in a non-terminal state
  if (providerStatus === "expired") {
    return handleCheckoutExpired(paymentIntentId, ctx);
  }

  // Map provider state to local processing state
  if (["processing", "in_progress"].includes(providerStatus)) {
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("payment_intents" as never)
      .update({ status: "processing" } as never)
      .eq("id" as never, paymentIntentId)
      .in("status" as never, ["creating", "open"] as never);
  }

  logger.info("appointment_payment_checkout_updated", ctx);
  return { status: "projection_updated", paymentIntentId };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractData(payload: WebhookPayload): WebhookPayload {
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data as WebhookPayload;
  }
  return payload;
}

function extractMetadata(data: WebhookPayload): Record<string, unknown> {
  if (data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)) {
    return data.metadata as Record<string, unknown>;
  }
  return {};
}

function extractAmount(data: WebhookPayload): number | null {
  const amount = data.amount ?? data.total_amount ?? data.paid_amount;
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") {
    const parsed = parseInt(amount, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function extractCurrency(data: WebhookPayload): string | null {
  const currency = data.currency;
  if (typeof currency === "string" && currency.length === 3) {
    return currency.toUpperCase();
  }
  return null;
}
