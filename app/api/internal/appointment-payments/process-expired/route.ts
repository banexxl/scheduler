import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedBearerSecret } from "@/lib/security/internal-route-auth";
import { logger, resolveRequestId } from "@/lib/logging";
import { processExpiredAppointmentPayments } from "@/features/payments/services/process-expired-payments";

/**
 * POST /api/internal/appointment-payments/process-expired
 *
 * Protected endpoint for processing expired payment deadlines.
 * Cancels unpaid appointments whose payment deadline has passed.
 * Triggers waitlist matching for freed slots.
 *
 * Schedule: every 1 minute.
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

  const requestId = resolveRequestId(request.headers.get("x-request-id"));

  try {
    const result = await processExpiredAppointmentPayments();

    logger.info("appointment_payment_expiry_processed", {
      requestId,
      worker: "payment_expiry",
      ...result,
    });

    return NextResponse.json({ ...result, requestId });
  } catch (error) {
    logger.error("appointment_payment_expiry_failed", {
      requestId,
      worker: "payment_expiry",
    }, error);
    return NextResponse.json({ error: "Processing failed", requestId }, { status: 500 });
  }
}
