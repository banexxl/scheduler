import { NextRequest, NextResponse } from "next/server";
import { parsePolarWebhook } from "@/features/platform/services/polar-webhook-handler";
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
  const { payload, error } = await parsePolarWebhook(request, "CUSTOMER");
  if (error) return error;

  const event = payload as Record<string, unknown>;
  const eventType = String(event.type ?? event.event ?? "");

  logger.info("polar_webhook_customer", { operation: "webhook.customer", eventType });

  // Not implemented — acknowledge receipt
  return NextResponse.json({ received: true, handler: "customer_not_implemented" }, { status: 200 });
}

