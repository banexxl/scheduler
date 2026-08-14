import { NextRequest, NextResponse } from "next/server";
import { verifyPolarWebhookSignature } from "@/features/platform/services/polar-webhook-signature";
import { getPolarEnvironment, getPolarWebhookSecret } from "@/features/platform/services/polar-config";
import { logger } from "@/lib/logging";

export const dynamic = "force-dynamic";

/**
 * Polar Customer Webhook — handles customer.created, customer.updated events.
 *
 * Not currently implemented — Polar customer records are managed
 * through billing checkout flows. This hook is registered for
 * future use (customer sync, billing customer updates).
 */
export async function POST(request: NextRequest) {
  const { payload, error } = await parseAndVerify(request);
  if (error) return error;

  const event = payload as Record<string, unknown>;
  const eventType = String(event.type ?? event.event ?? "");

  logger.info("polar_webhook_customer", { operation: "webhook.customer", eventType });

  // Not implemented — acknowledge receipt
  return NextResponse.json({ received: true, handler: "customer_not_implemented" }, { status: 200 });
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
  const secret = getPolarWebhookSecret("CUSTOMER");

  if (!verifyPolarWebhookSignature({ rawBody, signatureHeader: sig, secret })) {
    return { payload: null, error: NextResponse.json({ error: "Invalid signature" }, { status: 401 }) };
  }

  try {
    return { payload: JSON.parse(rawBody), error: null };
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}
