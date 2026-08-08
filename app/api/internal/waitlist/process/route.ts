import { NextRequest, NextResponse } from "next/server";
import { expireWaitlistItems } from "@/features/waitlist/services/waitlist-expiration";

/**
 * POST /api/internal/waitlist/process
 *
 * Protected waitlist processing endpoint — Milestone 8.8.
 * Expires old entries and offers. Can be called by cron.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.replace("Bearer ", "") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireWaitlistItems();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
