import { NextRequest, NextResponse } from "next/server";
import { parsePolarWebhook } from "@/features/platform/services/polar-webhook-handler";
import { logger } from "@/lib/logging";

export const dynamic = "force-dynamic";

/**
 * Polar Organization Webhook — handles organization.updated events.
 *
 * Not currently implemented — the platform Polar organization config
 * is managed through environment variables. This hook is registered
 * for future use (org settings sync).
 */
export async function POST(request: NextRequest) {
  const { payload, error } = await parsePolarWebhook(request, "ORGANIZATION");
  if (error) return error;

  const event = payload as Record<string, unknown>;
  const eventType = String(event.type ?? event.event ?? "");

  logger.info("polar_webhook_organization", { operation: "webhook.organization", eventType });

  // Not implemented — acknowledge receipt
  return NextResponse.json({ received: true, handler: "organization_not_implemented" }, { status: 200 });
}

