import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";
import { logger, resolveRequestId } from "@/lib/logging";
import { runFullReconciliation } from "@/features/payments/services/reconcile-payments";

/**
 * POST /api/internal/payments/reconcile
 *
 * Protected reconciliation endpoint. Detects and repairs
 * stale/missed payment states. Schedule: every 10-15 min.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  if (!isAuthorizedBearerSecret({
    authorizationHeader: request.headers.get("authorization"),
    expectedSecret: secret,
  })) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestId = resolveRequestId(request.headers.get("x-request-id"));

  try {
    const result = await runFullReconciliation();
    return NextResponse.json({ ...result, requestId });
  } catch (error) {
    logger.error("reconciliation_route_failed", { requestId, worker: "reconciliation" }, error);
    return NextResponse.json({ error: "Reconciliation failed", requestId }, { status: 500 });
  }
}
