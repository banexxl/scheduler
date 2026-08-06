import "server-only";

/**
 * Email Provider Factory — Milestone 6.12.
 *
 * Returns the configured email provider based on the EMAIL_PROVIDER
 * environment variable. Defaults to console provider for safety.
 */

import type { EmailProvider, EmailProviderName } from "../../types/notification";
import { ConsoleEmailProvider } from "./console-provider";
import { NodemailerEmailProvider } from "./nodemailer-provider";

let cachedProvider: EmailProvider | null = null;

/**
 * Returns the configured email provider.
 * Caches the instance for the lifetime of the server process.
 */
export function getEmailProvider(): EmailProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = (process.env.EMAIL_PROVIDER ?? "console") as EmailProviderName;

  switch (providerName) {
    case "nodemailer":
      cachedProvider = new NodemailerEmailProvider();
      break;
    case "console":
    default:
      cachedProvider = new ConsoleEmailProvider();
      break;
  }

  return cachedProvider;
}

/**
 * Returns the name of the currently configured provider.
 */
export function getEmailProviderName(): EmailProviderName {
  const providerName = process.env.EMAIL_PROVIDER;
  if (providerName === "nodemailer") return "nodemailer";
  return "console";
}

/**
 * Returns whether the email provider is configured for production use.
 * Used in settings UI to show provider status.
 */
export function isEmailProviderConfigured(): boolean {
  const providerName = process.env.EMAIL_PROVIDER;
  if (providerName === "nodemailer") {
    return Boolean(process.env.SMTP_HOST && process.env.NOTIFICATION_FROM_EMAIL);
  }
  // Console provider is always "configured" (it's for development)
  return true;
}

/**
 * Resets the cached provider instance. Used in testing only.
 */
export function resetProviderCache(): void {
  cachedProvider = null;
}
