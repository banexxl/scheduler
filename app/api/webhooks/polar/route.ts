import { NextRequest, NextResponse } from "next/server";
import { getPolarEnvironment } from "@/features/platform/services/polar-config";
import { verifyPolarWebhookSignature } from "@/features/platform/services/polar-webhook-signature";
import { persistBillingWebhookEvent } from "@/features/platform/services/billing-webhook-events";

export const dynamic = "force-dynamic";

function getSignatureHeader(request: NextRequest): string | null {
     return (
          request.headers.get("polar-signature") ??
          request.headers.get("x-polar-signature") ??
          request.headers.get("svix-signature")
     );
}

export async function POST(request: NextRequest) {
     let environment;
     try {
          environment = getPolarEnvironment();
     } catch {
          return NextResponse.json(
               { error: "Billing webhook endpoint is not configured" },
               { status: 503 }
          );
     }

     const rawBody = await request.text();
     const signatureHeader = getSignatureHeader(request);

     const isValid = verifyPolarWebhookSignature({
          rawBody,
          signatureHeader,
          secret: environment.webhookSecret,
     });

     if (!isValid) {
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
     }

     let payload: unknown;
     try {
          payload = JSON.parse(rawBody);
     } catch {
          return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
     }

     try {
          const persisted = await persistBillingWebhookEvent({ payload, rawBody });

          return NextResponse.json(
               {
                    received: true,
                    duplicate: persisted.duplicate,
                    eventId: persisted.eventId,
               },
               { status: 200 }
          );
     } catch (error) {
          console.error("[webhooks/polar] Persist failed", {
               error: error instanceof Error ? error.message : "unknown",
          });

          return NextResponse.json(
               { error: "Unable to ingest webhook event" },
               { status: 500 }
          );
     }
}
