/**
 * Date/Time Display Formatters — Milestone 12.7.
 *
 * Centralized formatting for consistent date/time display.
 * All scheduling surfaces use tenant timezone (server-resolved).
 */

/**
 * Formats an ISO date string to localized date display.
 * Example: "Aug 9, 2026"
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats an ISO string to time display.
 * Example: "14:30"
 */
export function formatTime(isoString: string): string {
  return isoString.slice(11, 16);
}

/**
 * Formats an ISO string to date + time.
 * Example: "Aug 9, 2026 at 14:30"
 */
export function formatDateTime(isoString: string): string {
  return `${formatDate(isoString)} at ${formatTime(isoString)}`;
}

/**
 * Formats relative time from now.
 * Example: "in 20 min", "2 hours ago"
 */
export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const target = new Date(isoString).getTime();
  const diffMs = target - now;
  const absDiff = Math.abs(diffMs);
  const future = diffMs > 0;

  if (absDiff < 60_000) return "just now";

  const minutes = Math.round(absDiff / 60_000);
  if (minutes < 60) {
    return future ? `in ${minutes} min` : `${minutes} min ago`;
  }

  const hours = Math.round(absDiff / 3_600_000);
  if (hours < 24) {
    return future ? `in ${hours}h` : `${hours}h ago`;
  }

  const days = Math.round(absDiff / 86_400_000);
  return future ? `in ${days}d` : `${days}d ago`;
}

/**
 * Formats duration in minutes to human-readable.
 * Example: "1h 30min", "45min"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
