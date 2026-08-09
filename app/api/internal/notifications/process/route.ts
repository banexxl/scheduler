import { NextRequest, NextResponse } from "next/server";
import { processNotificationBatch } from "@/features/notifications/services/process-notifications";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";
import { logger, resolveRequestId } from "@/lib/logging";

/**
 * POST /api/internal/notifications/process
 *
 * Protected notification processing endpoint — Milestone 6.12.
 *
 * Claims a batch of pending notifications and processes them via the
 * configured email provider. Protected by NOTIFICATION_PROCESSOR_SECRET.
 *
 * Designed to be called by:
 * - External cron/scheduler (e.g., Vercel Cron, Railway Cron)
 * - Manual admin trigger for development/diagnostics
 *
 * Query params:
 * - batchSize (optional): Number of notifications to process (default: 10, max: 50)
 *
 * Security:
 * - Requires Authorization header matching NOTIFICATION_PROCESSOR_SECRET
 * - Constant-time comparison prevents timing attacks
 * - No public access
 * - Does not expose recipient addresses in response
 */
export async function POST(request: NextRequest) {
  // Authenticate request
  const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Notification processor is not configured" },
      { status: 503 }
    );
  }

  if (
    !isAuthorizedBearerSecret({
      authorizationHeader: request.headers.get("authorization"),
      expectedSecret: secret,
    })
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Parse batch size
  const { searchParams } = new URL(request.url);
  const batchSizeParam = searchParams.get("batchSize");
  const batchSize = batchSizeParam ? parseInt(batchSizeParam, 10) : 10;

  if (isNaN(batchSize) || batchSize < 1) {
    return NextResponse.json(
      { error: "Invalid batchSize parameter" },
      { status: 400 }
    );
  }

  try {
    const result = await processNotificationBatch(batchSize);

    // Return safe diagnostics (no recipient addresses)
    return NextResponse.json({
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      retrying: result.retrying,
      results: result.results.map((r) => ({
        outboxId: r.outboxId,
        status: r.status,
        errorCode: r.errorCode ?? null,
      })),
    });
  } catch (error) {
    const requestId = resolveRequestId(request.headers.get("x-request-id"));
    logger.error("notification_process_route_failed", {
      requestId,
      worker: "notifications",
    }, error);

    return NextResponse.json(
      { error: "Processing failed", requestId },
      { status: 500 }
    );
  }
}
