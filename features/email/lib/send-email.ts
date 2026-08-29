import "server-only";

/**
 * Email Send Utility — Milestone 18.2.
 *
 * Wraps the existing email provider with retry logic and structured logging.
 * Uses the provider factory from features/notifications (nodemailer or console).
 */

import { getEmailProvider } from "@/features/notifications/services/providers";
import type { SendEmailResult } from "@/features/notifications/types/notification";

export type SendBookingEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName: string;
  replyTo?: string | null;
  idempotencyKey: string;
};

const MAX_RETRIES = 2;

/**
 * Sends an email using the configured provider with retry on transient failures.
 * Failures are logged but never thrown — email must not block booking operations.
 */
export async function sendBookingEmail(
  input: SendBookingEmailInput
): Promise<{ sent: boolean; messageId: string | null }> {
  const provider = getEmailProvider();
  let lastResult: SendEmailResult | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      lastResult = await provider.send({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        fromName: input.fromName,
        replyTo: input.replyTo ?? undefined,
        idempotencyKey: input.idempotencyKey,
      });

      if (lastResult.success) {
        return { sent: true, messageId: lastResult.providerMessageId };
      }

      // Non-retryable failure — stop
      if (!lastResult.retryable) {
        console.error("[send-booking-email] Non-retryable failure:", {
          to: input.to,
          subject: input.subject,
          errorCode: lastResult.errorCode,
          attempt,
        });
        return { sent: false, messageId: null };
      }

      // Retryable — log and continue
      console.warn("[send-booking-email] Retryable failure, retrying:", {
        attempt,
        errorCode: lastResult.errorCode,
      });
    } catch (error) {
      console.error("[send-booking-email] Unexpected error:", {
        to: input.to,
        attempt,
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }

  return { sent: false, messageId: null };
}
