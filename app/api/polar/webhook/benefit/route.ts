import { NextRequest, NextResponse } from "next/server";
import { parsePolarWebhook } from "@/features/platform/services/polar-webhook-handler";
import { logger } from "@/lib/logging";

export const dynamic = "force-dynamic";

/**
 * Polar Benefit Webhook — handles benefit.created, benefit.updated, benefit.granted, benefit.revoked.
 *
 * Not currently implemented — the platform does not use Polar benefits
 * for feature gating. Tenant features are controlled via platform_tenant_feature_overrides.
 * This hook is registered for future use.
 */
export async function POST(request: NextRequest) {
  const { payload, error } = await parsePolarWebhook(request, "BENEFIT");
  if (error) return error;

  const event = payload as Record<string, unknown>;
  const eventType = String(event.type ?? event.event ?? "");

  logger.info("polar_webhook_benefit", { operation: "webhook.benefit", eventType });

  // Not implemented — acknowledge receipt
  return NextResponse.json({ received: true, handler: "benefit_not_implemented" }, { status: 200 });
}

