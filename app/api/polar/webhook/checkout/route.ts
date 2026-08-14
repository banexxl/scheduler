import { NextRequest, NextResponse } from "next/server";
import { verifyPolarWebhookSignature } from "@/features/platform/services/polar-webhook-signature";
import { getPolarEnvironment, getPolarWebhookSecret } from "@/features/platform/services/polar-config";
import { logger } from "@/lib/logging";
import { isAppointmentPaymentEvent, processAppointmentPaymentWebhook } from "@/features/payments/services/process-appointment-payment-webhook";
import { isGiftCardPurchaseEvent, processGiftCardPurchaseOrderPaid } from "@/features/gift-cards/services/process-gift-card-webhook";

export const dynamic = "force-dynamic";

/**
 * Polar Checkout Webhook — handles checkout.created, checkout.updated events.
 *
 * Routes to appropriate handler based on metadata:
 * - Appointment payments (payment_intent_id in metadata)
 * - Gift card purchases (gift_card_purchase_id in metadata)
 * - SaaS billing checkouts (handled by billing persistence)
 */
export async function POST(request: NextRequest) {
  const { payload, error } = await parseAndVerify(request);
  if (error) return error;

  const event = payload as Record<string, unknown>;
  const eventType = String(event.type ?? event.event ?? "");

  logger.info("polar_webhook_checkout", { operation: "webhook.checkout", eventType });

  try {
    // Route to domain handlers
    if (isAppointmentPaymentEvent(event)) {
      await processAppointmentPaymentWebhook(eventType, event, String((event.data as Record<string, unknown>)?.id ?? ""));
      return NextResponse.json({ received: true, handler: "appointment_payment" }, { status: 200 });
    }

    if (isGiftCardPurchaseEvent(event)) {
      await processGiftCardPurchaseOrderPaid(event);
      return NextResponse.json({ received: true, handler: "gift_card_purchase" }, { status: 200 });
    }

    // Generic checkout event — acknowledge
    return NextResponse.json({ received: true, handler: "checkout_generic" }, { status: 200 });
  } catch (err) {
    logger.error("polar_webhook_checkout_error", { operation: "webhook.checkout" }, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function parseAndVerify(request: NextRequest) {
  let environment;
  try {
    environment = getPolarEnvironment();
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Not configured" }, { status: 503 }) };
  }

  const rawBody = await request.text();
  const sig = request.headers.get("polar-signature") ?? request.headers.get("x-polar-signature") ?? request.headers.get("svix-signature");
  const secret = getPolarWebhookSecret("CHECKOUT");

  if (!verifyPolarWebhookSignature({ rawBody, signatureHeader: sig, secret })) {
    return { payload: null, error: NextResponse.json({ error: "Invalid signature" }, { status: 401 }) };
  }

  try {
    return { payload: JSON.parse(rawBody), error: null };
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}
