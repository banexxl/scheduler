import { NextRequest, NextResponse } from "next/server";
import { processDueAutomationEnrollments } from "@/features/automations/services/step-processor";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";
import { logger, resolveRequestId } from "@/lib/logging";

/**
 * POST /api/internal/automations/process
 *
 * Protected automation step processor endpoint — Milestone 15.8.
 *
 * Claims due automation enrollments and executes their current steps.
 * Designed to be called frequently (e.g., every 1-2 minutes) by external cron.
 *
 * Security: NOTIFICATION_PROCESSOR_SECRET (same as campaign/notification processors).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Automation processor is not configured" },
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
  const batchSize = Math.min(Math.max(1, parseInt(searchParams.get("batchSize") ?? "50", 10)), 100);

  try {
    const result = await processDueAutomationEnrollments(batchSize);

    return NextResponse.json({
      processed: result.processed,
      advanced: result.advanced,
      completed: result.completed,
      skipped: result.skipped,
      failed: result.failed,
    });
  } catch (error) {
    const requestId = resolveRequestId(request.headers.get("x-request-id"));
    logger.error("automation_process_route_failed", { requestId }, error);
    return NextResponse.json({ error: "Processing failed", requestId }, { status: 500 });
  }
}
