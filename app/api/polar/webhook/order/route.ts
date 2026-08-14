import { NextRequest, NextResponse } from "next/server";
import { parsePolarWebhook } from "@/features/platform/services/polar-webhook-handler";
import { logger } from "@/lib/logging";
import { persistBillingWebhookEvent } from "@/features/platform/services/billing-webhook-events";
import { isAppointmentPaymentEvent, processAppointmentPaymentWebhook } from "@/features/payments/services/process-appointment-payment-webhook";
import { isGiftCardPurchaseEvent, processGiftCardPurchaseOrderPaid } from "@/features/gift-cards/services/process-gift-card-webhook";

export const dynamic = "force-dynamic";

/**
 * Polar Order Webhook — handles order.created, order.paid, order.refunded events.
 *
 * This is the FINANCIAL AUTHORITY for:
 * - Appointment payments (order.paid marks payment as succeeded)
 * - Gift card fulfillment (order.paid triggers gift card issuance)
 * - SaaS billing orders (persisted for billing reconciliation)
 */
export async function POST(request: NextRequest) {
  const { payload, error } = await parsePolarWebhook(request, "ORDER");
  if (error) return error;

  const event = payload as Record<string, unknown>;
  const eventType = String(event.type ?? event.event ?? "");

  logger.info("polar_webhook_order", { operation: "webhook.order", eventType });

  try {
    // Persist for billing audit trail
    await persistBillingWebhookEvent({ payload: event, rawBody: JSON.stringify(event) }).catch(() => { });

    // Route to domain handlers
    if (isAppointmentPaymentEvent(event)) {
      await processAppointmentPaymentWebhook(eventType, event, String((event.data as Record<string, unknown>)?.id ?? ""));
      return NextResponse.json({ received: true, handler: "appointment_payment" }, { status: 200 });
    }

    if (isGiftCardPurchaseEvent(event)) {
      await processGiftCardPurchaseOrderPaid(event);
      return NextResponse.json({ received: true, handler: "gift_card" }, { status: 200 });
    }

    // SaaS billing order — already persisted above
    return NextResponse.json({ received: true, handler: "billing_order" }, { status: 200 });
  } catch (err) {
    logger.error("polar_webhook_order_error", { operation: "webhook.order" }, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

