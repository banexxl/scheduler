/**
 * Returns the browser-detected IANA timezone.
 * Falls back to "Europe/Belgrade" if detection fails.
 *
 * This helper is client-only. Do not import in Server Components.
 */
export function getBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.length > 0) {
      return tz;
    }
  } catch {
    // Intl not available or failed
  }
  return "Europe/Belgrade";
}
