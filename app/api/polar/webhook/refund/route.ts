import { NextRequest, NextResponse } from "next/server";
import { parsePolarWebhook } from "@/features/platform/services/polar-webhook-handler";
import { logger } from "@/lib/logging";
import { persistBillingWebhookEvent } from "@/features/platform/services/billing-webhook-events";

export const dynamic = "force-dynamic";

/**
 * Polar Refund Webhook — handles refund.created, refund.updated events.
 *
 * Used for:
 * - Appointment payment refund confirmation
 * - SaaS billing refund tracking
 * - Gift card refund adjustments
 */
export async function POST(request: NextRequest) {
  const { payload, error } = await parsePolarWebhook(request, "REFUND");
  if (error) return error;

  const event = payload as Record<string, unknown>;
  const eventType = String(event.type ?? event.event ?? "");

  logger.info("polar_webhook_refund", { operation: "webhook.refund", eventType });

  try {
    // Persist for audit trail
    await persistBillingWebhookEvent({ payload: event, rawBody: JSON.stringify(event) });

    // TODO: Route to appointment refund processor or billing refund processor
    // based on metadata content

    return NextResponse.json({ received: true, handler: "refund" }, { status: 200 });
  } catch (err) {
    logger.error("polar_webhook_refund_error", { operation: "webhook.refund" }, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

