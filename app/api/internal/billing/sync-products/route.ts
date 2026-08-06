import { NextRequest, NextResponse } from "next/server";
import { getBillingSyncSecret } from "@/features/platform/services/polar-config";
import { syncAllPolarProducts } from "@/features/platform/services/sync-polar-product";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";

export async function POST(request: NextRequest) {
     let secret: string;
     try {
          secret = getBillingSyncSecret();
     } catch {
          return NextResponse.json(
               { error: "Billing sync is not configured" },
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
          const counters = await syncAllPolarProducts({
               source: "initial_import",
               runType: "initial_import",
               requestedBy: "internal-sync-route",
          });

          return NextResponse.json(counters, { status: 200 });
     } catch (error) {
          console.error("[internal/billing/sync-products] Route error", {
               error: error instanceof Error ? error.message : "unknown",
          });

          return NextResponse.json({ error: "Sync failed" }, { status: 500 });
     }
}
