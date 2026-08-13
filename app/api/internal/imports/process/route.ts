import { NextRequest, NextResponse } from "next/server";
import { processImportJobs } from "@/features/imports/services/import-processor";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";
import { logger, resolveRequestId } from "@/lib/logging";

/**
 * POST /api/internal/imports/process
 *
 * Protected import processor endpoint — Milestone 15.10.
 * Claims and processes import rows in bounded batches.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  if (!isAuthorizedBearerSecret({ authorizationHeader: request.headers.get("authorization"), expectedSecret: secret })) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processImportJobs();
    return NextResponse.json(result);
  } catch (error) {
    const requestId = resolveRequestId(request.headers.get("x-request-id"));
    logger.error("import_process_route_failed", { requestId }, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
