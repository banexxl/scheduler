import { NextRequest, NextResponse } from "next/server";
import { getBillingSyncSecret } from "@/features/platform/services/polar-config";
import {
     reconcileActiveLocalSubscriptions,
     reconcileOneSubscription,
     reconcileSubscriptionsForPolarCustomer,
     reconcileSubscriptionBackfill,
} from "@/features/platform/services/reconcile-polar-subscriptions";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";

export async function POST(request: NextRequest) {
     let secret: string;
     try {
          secret = getBillingSyncSecret();
     } catch {
          return NextResponse.json(
               { error: "Billing reconciliation is not configured" },
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

     try {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

          const polarSubscriptionId =
               typeof body.polarSubscriptionId === "string" ? body.polarSubscriptionId : null;
          const polarCustomerId =
               typeof body.polarCustomerId === "string" ? body.polarCustomerId : null;
          const limit =
               typeof body.limit === "number" && Number.isFinite(body.limit)
                    ? Math.min(Math.max(body.limit, 1), 200)
                    : 100;

          if (polarSubscriptionId) {
               const result = await reconcileOneSubscription(
                    polarSubscriptionId,
                    "reconciliation"
               );
               return NextResponse.json(result, { status: 200 });
          }

          if (polarCustomerId) {
               const result = await reconcileSubscriptionsForPolarCustomer({
                    polarCustomerId,
                    source: "reconciliation",
                    limit,
               });
               return NextResponse.json(result, { status: 200 });
          }

          if (body.mode === "backfill") {
               const result = await reconcileSubscriptionBackfill({
                    source: "reconciliation",
                    limit,
               });
               return NextResponse.json(result, { status: 200 });
          }

          const result = await reconcileActiveLocalSubscriptions({
               source: "reconciliation",
               limit,
          });

          return NextResponse.json(result, { status: 200 });
     } catch (error) {
          console.error("[internal/billing/reconcile-subscriptions] Route error", {
               error: error instanceof Error ? error.message : "unknown",
          });

          return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
     }
}
