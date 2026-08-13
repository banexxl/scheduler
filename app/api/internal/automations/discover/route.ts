import { NextRequest, NextResponse } from "next/server";
import { runScheduledTriggerDiscovery } from "@/features/automations/services/scheduled-trigger-discovery";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";
import { logger, resolveRequestId } from "@/lib/logging";

/**
 * POST /api/internal/automations/discover
 *
 * Protected scheduled trigger discovery endpoint — Milestone 15.8.
 *
 * Discovers customers eligible for scheduled automation triggers:
 * - customer_inactive (daily)
 * - package_expiring (daily)
 *
 * Designed to be called once per day by external cron.
 * Uses bounded queries (max 200 candidates per automation per run).
 *
 * Security: NOTIFICATION_PROCESSOR_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Automation discovery is not configured" },
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
    const result = await runScheduledTriggerDiscovery();

    return NextResponse.json({
      inactiveEnrolled: result.inactiveEnrolled,
      packageExpiringEnrolled: result.packageExpiringEnrolled,
    });
  } catch (error) {
    const requestId = resolveRequestId(request.headers.get("x-request-id"));
    logger.error("automation_discover_route_failed", { requestId }, error);
    return NextResponse.json({ error: "Discovery failed", requestId }, { status: 500 });
  }
}
