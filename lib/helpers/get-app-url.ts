import { clientEnvironment } from "@/lib/environment/client";

/**
 * Returns the canonical application origin URL.
 * Uses the validated NEXT_PUBLIC_APP_URL environment variable.
 * Trailing slash is always stripped.
 *
 * Use this everywhere an absolute URL is needed (auth callbacks, emails, etc.)
 * instead of manually concatenating process.env values.
 */
export function getAppUrl(): string {
  return clientEnvironment.appUrl;
}
