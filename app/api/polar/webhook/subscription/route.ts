import { NextRequest, NextResponse } from "next/server";
import { verifyPolarWebhookSignature } from "@/features/platform/services/polar-webhook-signature";
import { getPolarEnvironment, getPolarWebhookSecret } from "@/features/platform/services/polar-config";
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
  const { payload, error } = await parseAndVerify(request);
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

async function parseAndVerify(request: NextRequest) {
  let environment;
  try {
    environment = getPolarEnvironment();
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Not configured" }, { status: 503 }) };
  }

  const rawBody = await request.text();
  const sig = request.headers.get("polar-signature") ?? request.headers.get("x-polar-signature") ?? request.headers.get("svix-signature");
  const secret = getPolarWebhookSecret("SUBSCRIPTION");

  if (!verifyPolarWebhookSignature({ rawBody, signatureHeader: sig, secret })) {
    return { payload: null, error: NextResponse.json({ error: "Invalid signature" }, { status: 401 }) };
  }

  try {
    return { payload: JSON.parse(rawBody), error: null };
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}
