import { NextRequest, NextResponse } from "next/server";
import { processReminderBatch } from "@/features/notifications/services/process-reminders";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";

/**
 * POST /api/internal/reminders/process
 *
 * Protected reminder processing endpoint — Milestone 6.13.
 *
 * Claims due reminders and enqueues them into the notification outbox.
 * The separate notification processor handles actual SMTP delivery.
 *
 * Protected by NOTIFICATION_PROCESSOR_SECRET (shared with notification processor).
 * Constant-time comparison prevents timing attacks.
 *
 * Query params:
 * - batchSize (optional): Number of reminders to process (default: 10, max: 50)
 */
export async function POST(request: NextRequest) {
  // Authenticate request
  const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Reminder processor is not configured" },
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
    const result = await processReminderBatch(batchSize);

    // Return safe diagnostics (no customer details)
    return NextResponse.json({
      processed: result.processed,
      enqueued: result.enqueued,
      skipped: result.skipped,
      failed: result.failed,
      results: result.results.map((r) => ({
        reminderId: r.reminderId,
        status: r.status,
        reason: r.reason ?? null,
      })),
    });
  } catch (error) {
    console.error("[reminders/process] Route error:", {
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
