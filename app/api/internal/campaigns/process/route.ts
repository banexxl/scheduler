import { NextRequest, NextResponse } from "next/server";
import { processScheduledCampaigns } from "@/features/campaigns/services/campaign-processor";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";
import { logger, resolveRequestId } from "@/lib/logging";

/**
 * POST /api/internal/campaigns/process
 *
 * Protected campaign processing endpoint — Milestone 15.7.
 *
 * Claims due scheduled campaigns and processes their delivery.
 * Protected by NOTIFICATION_PROCESSOR_SECRET (same secret as notification processor).
 *
 * Designed to be called by external cron (e.g., every 1 minute).
 *
 * Security:
 * - Requires Authorization header matching NOTIFICATION_PROCESSOR_SECRET
 * - Constant-time comparison
 * - No public access
 * - Does not expose recipient addresses
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Campaign processor is not configured" },
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

  try {
    const result = await processScheduledCampaigns();

    return NextResponse.json({
      campaignsProcessed: result.campaignsProcessed,
      totalSent: result.totalSent,
      totalFailed: result.totalFailed,
      totalSkipped: result.totalSkipped,
    });
  } catch (error) {
    const requestId = resolveRequestId(request.headers.get("x-request-id"));
    logger.error("campaign_process_route_failed", { requestId }, error);

    return NextResponse.json(
      { error: "Processing failed", requestId },
      { status: 500 }
    );
  }
}
