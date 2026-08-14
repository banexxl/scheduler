import { NextRequest, NextResponse } from "next/server";
import { parsePolarWebhook } from "@/features/platform/services/polar-webhook-handler";
import { logger } from "@/lib/logging";
import { persistBillingWebhookEvent } from "@/features/platform/services/billing-webhook-events";

export const dynamic = "force-dynamic";

/**
 * Polar Subscription Webhook — handles subscription lifecycle events.
 *
 * Events: subscription.created, subscription.updated, subscription.active,
 *         subscription.canceled, subscription.revoked
 *
 * Used for SaaS billing (tenant subscriptions to platform plans).
 */
export async function POST(request: NextRequest) {
  const { payload, error } = await parsePolarWebhook(request, "SUBSCRIPTION");
  if (error) return error;

  const event = payload as Record<string, unknown>;
  const eventType = String(event.type ?? event.event ?? "");

  logger.info("polar_webhook_subscription", { operation: "webhook.subscription", eventType });

  try {
    // Persist event for billing reconciliation
    await persistBillingWebhookEvent({ payload: event, rawBody: JSON.stringify(event) });

    // TODO: Process subscription state changes (activate, cancel, revoke tenant access)
    // The billing sync processor handles this asynchronously from persisted events.

    return NextResponse.json({ received: true, handler: "subscription" }, { status: 200 });
  } catch (err) {
    logger.error("polar_webhook_subscription_error", { operation: "webhook.subscription" }, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

