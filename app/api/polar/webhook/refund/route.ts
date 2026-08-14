import { NextRequest, NextResponse } from "next/server";
import { verifyPolarWebhookSignature } from "@/features/platform/services/polar-webhook-signature";
import { getPolarEnvironment, getPolarWebhookSecret } from "@/features/platform/services/polar-config";
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
  const { payload, error } = await parseAndVerify(request);
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

async function parseAndVerify(request: NextRequest) {
  let environment;
  try {
    environment = getPolarEnvironment();
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Not configured" }, { status: 503 }) };
  }

  const rawBody = await request.text();
  const sig = request.headers.get("polar-signature") ?? request.headers.get("x-polar-signature") ?? request.headers.get("svix-signature");
  const secret = getPolarWebhookSecret("REFUND");

  if (!verifyPolarWebhookSignature({ rawBody, signatureHeader: sig, secret })) {
    return { payload: null, error: NextResponse.json({ error: "Invalid signature" }, { status: 401 }) };
  }

  try {
    return { payload: JSON.parse(rawBody), error: null };
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}
