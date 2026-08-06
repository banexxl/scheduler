/**
 * Formats a date string for display on the dashboard.
 * Uses a stable locale to avoid hydration mismatch between server and client.
 *
 * Returns null for null/empty input.
 */
export function formatDashboardDate(
  dateString: string | null | undefined
): string | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    // Use en-GB for stable "day Month year" format
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}
