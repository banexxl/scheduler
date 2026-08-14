import { NextRequest, NextResponse } from "next/server";
import { parsePolarWebhook } from "@/features/platform/services/polar-webhook-handler";
import { persistBillingWebhookEvent } from "@/features/platform/services/billing-webhook-events";

export const dynamic = "force-dynamic";

/**
 * Legacy unified Polar webhook route.
 * Individual per-event routes at /api/polar/webhook/* are preferred.
 * This route persists events for billing reconciliation as a catch-all.
 */

export async function POST(request: NextRequest) {
     const { payload, error } = await parsePolarWebhook(request, "SUBSCRIPTION");
     if (error) return error;

     try {
          const persisted = await persistBillingWebhookEvent({ payload, rawBody: JSON.stringify(payload) });

          return NextResponse.json(
               {
                    received: true,
                    duplicate: persisted.duplicate,
                    eventId: persisted.eventId,
               },
               { status: 200 }
          );
     } catch (err) {
          console.error("[webhooks/polar] Persist failed", {
               error: err instanceof Error ? err.message : "unknown",
          });

          return NextResponse.json(
               { error: "Unable to ingest webhook event" },
               { status: 500 }
          );
     }
}
