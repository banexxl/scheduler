import { NextRequest, NextResponse } from "next/server";
import { expireWaitlistItems } from "@/features/waitlist/services/waitlist-expiration";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";

/**
 * POST /api/internal/waitlist/process
 *
 * Protected waitlist processing endpoint — Milestone 8.8.
 * Expires old entries and offers. Can be called by cron.
 * Constant-time comparison prevents timing attacks.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
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
    const result = await expireWaitlistItems();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
