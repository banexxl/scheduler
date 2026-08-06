import { NextRequest, NextResponse } from "next/server";
import { getBillingSyncSecret } from "@/features/platform/services/polar-config";
import { reconcilePolarProducts } from "@/features/platform/services/sync-polar-product";
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
          const counters = await reconcilePolarProducts("internal-reconcile-route");
          return NextResponse.json(counters, { status: 200 });
     } catch (error) {
          console.error("[internal/billing/reconcile-products] Route error", {
               error: error instanceof Error ? error.message : "unknown",
          });

          return NextResponse.json(
               { error: "Reconciliation failed" },
               { status: 500 }
          );
     }
}
