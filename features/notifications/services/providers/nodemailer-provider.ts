import "server-only";

/**
 * Nodemailer Email Provider — Milestone 6.12.
 *
 * Production email provider using Nodemailer with SMTP transport.
 * Requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and
 * NOTIFICATION_FROM_EMAIL environment variables.
 *
 * Maps transport errors into retryable/non-retryable results.
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "../../types/notification";

/** Error codes/messages that indicate permanent failure (non-retryable) */
const NON_RETRYABLE_PATTERNS = [
  "invalid",
  "rejected",
  "mailbox not found",
  "user unknown",
  "no such user",
  "does not exist",
  "550",
  "553",
  "554",
];

function isNonRetryable(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return NON_RETRYABLE_PATTERNS.some((pattern) => lower.includes(pattern));
}

export class NodemailerEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;
  private readonly fromEmail: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromEmail = process.env.NOTIFICATION_FROM_EMAIL;
    const secure = process.env.SMTP_SECURE !== "false"; // default true

    if (!host) {
      throw new Error(
        "SMTP_HOST is not configured. " +
        "The Nodemailer provider requires an SMTP host to operate."
      );
    }

    if (!fromEmail) {
      throw new Error(
        "NOTIFICATION_FROM_EMAIL is not configured. " +
        "The Nodemailer provider requires a sender address."
      );
    }

    this.fromEmail = fromEmail;

    this.transporter = nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : 587,
      secure: secure && (port === "465"),
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const from = input.fromName
      ? `"${input.fromName.replace(/"/g, '\\"')}" <${this.fromEmail}>`
      : this.fromEmail;

    try {
      const info = await this.transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo ?? undefined,
        headers: {
          "X-Idempotency-Key": input.idempotencyKey,
        },
      });

      const messageId = info.messageId ?? null;

      return {
        success: true,
        providerMessageId: messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown SMTP error";
      const isTimeout = errorMessage.toLowerCase().includes("timeout");
      const isConnection = errorMessage.toLowerCase().includes("connect");
      const retryable = isTimeout || isConnection || !isNonRetryable(errorMessage);

      // Extract SMTP response code if available
      const responseCode = (error as { responseCode?: number })?.responseCode;
      const errorCode = responseCode
        ? `smtp_${responseCode}`
        : isTimeout
          ? "timeout"
          : "smtp_error";

      return {
        success: false,
        retryable,
        errorCode,
        safeMessage: errorMessage.slice(0, 500),
      };
    }
  }
}
