import "server-only";

/**
 * Console Email Provider — Milestone 6.12.
 *
 * Development-only provider that logs email metadata without sending externally.
 * Does not log full email bodies by default to avoid leaking sensitive content.
 */

import type { EmailProvider, SendEmailInput, SendEmailResult } from "../../types/notification";

export class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const syntheticId = `console_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    console.log("[ConsoleEmailProvider] Email sent (dev mode):", {
      to: input.to,
      subject: input.subject,
      fromName: input.fromName,
      replyTo: input.replyTo ?? null,
      idempotencyKey: input.idempotencyKey,
      providerMessageId: syntheticId,
      htmlLength: input.html.length,
      textLength: input.text.length,
    });

    return {
      success: true,
      providerMessageId: syntheticId,
    };
  }
}
