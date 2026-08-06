import { NextRequest, NextResponse } from "next/server";
import { getBillingProcessorSecret } from "@/features/platform/services/polar-config";
import { processBillingWebhookBatch } from "@/features/platform/services/process-billing-webhooks";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";

export async function POST(request: NextRequest) {
     let secret: string;
     try {
          secret = getBillingProcessorSecret();
     } catch {
          return NextResponse.json(
               { error: "Billing processor is not configured" },
               { status: 503 }
          );
     }

     if (
          !isAuthorizedBearerSecret({
               authorizationHeader: request.headers.get("authorization"),
               expectedSecret: secret,
          })
     ) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }

     const { searchParams } = new URL(request.url);
     const batchSizeRaw = searchParams.get("batchSize") ?? "10";
     const batchSize = Number.parseInt(batchSizeRaw, 10);

     if (!Number.isFinite(batchSize) || batchSize < 1) {
          return NextResponse.json(
               { error: "Invalid batchSize parameter" },
               { status: 400 }
          );
     }

     try {
          const result = await processBillingWebhookBatch(batchSize);
          return NextResponse.json(result, { status: 200 });
     } catch (error) {
          console.error("[internal/billing/process-webhooks] Route error", {
               error: error instanceof Error ? error.message : "unknown",
          });

          return NextResponse.json({ error: "Processing failed" }, { status: 500 });
     }
}
