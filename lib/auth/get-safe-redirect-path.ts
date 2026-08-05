/**
 * Validates a redirect path to prevent open redirect attacks.
 *
 * Only allows local paths that:
 * - Begin with exactly one "/"
 * - Do not begin with "//"
 * - Do not contain a protocol
 * - Do not resolve to an external hostname
 *
 * Returns the validated path or the provided fallback.
 */
export function getSafeRedirectPath(
  requested: string | null | undefined,
  fallback: string = "/account"
): string {
  if (!requested || typeof requested !== "string") {
    return fallback;
  }

  const trimmed = requested.trim();

  // Must start with exactly one /
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Reject protocol-relative URLs (//example.com)
  if (trimmed.startsWith("//")) {
    return fallback;
  }

  // Reject anything with a protocol
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    return fallback;
  }

  // Reject javascript: and data: schemes anywhere
  if (/javascript:/i.test(trimmed) || /data:/i.test(trimmed)) {
    return fallback;
  }

  // Reject encoded slashes that could bypass checks
  if (/%2f/i.test(trimmed.slice(0, 2))) {
    return fallback;
  }

  return trimmed;
}
