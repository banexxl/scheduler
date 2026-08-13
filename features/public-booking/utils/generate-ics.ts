/**
 * ICS Calendar Export Utility — Milestone 15.12.
 *
 * Generates an ICS (iCalendar) file for appointment confirmation.
 * Uses RFC 5545 format for broad compatibility with:
 * - Apple Calendar
 * - Google Calendar
 * - Outlook
 * - Other calendar applications
 *
 * Security:
 * - Does NOT expose internal notes
 * - Does NOT expose internal IDs
 * - Only includes public-safe appointment information
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type IcsEventInput = {
  /** Event title (e.g., "Massage at Acme Spa") */
  title: string;
  /** Start time in ISO 8601 UTC (e.g., "2024-03-15T10:00:00Z") */
  startsAtUtc: string;
  /** End time in ISO 8601 UTC */
  endsAtUtc: string;
  /** Location name or address */
  location?: string;
  /** Event description */
  description?: string;
  /** Organizer name (business name) */
  organizerName?: string;
};

// ─── ICS Generation ──────────────────────────────────────────────────────────

/**
 * Generates an ICS calendar file content string.
 * Returns the raw ICS text suitable for download as a .ics file.
 */
export function generateIcsContent(event: IcsEventInput): string {
  const uid = generateUid();
  const now = formatIcsDateTime(new Date().toISOString());
  const dtStart = formatIcsDateTime(event.startsAtUtc);
  const dtEnd = formatIcsDateTime(event.endsAtUtc);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//get-slot//Appointment Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }

  if (event.organizerName) {
    lines.push(`ORGANIZER;CN=${escapeIcsText(event.organizerName)}:MAILTO:noreply@get-slot.app`);
  }

  lines.push("STATUS:CONFIRMED");
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}

/**
 * Triggers a browser download of the ICS file.
 * Call this from client-side event handlers only.
 */
export function downloadIcsFile(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Formats an ISO 8601 timestamp to ICS DATETIME format.
 * Input: "2024-03-15T10:00:00Z" or "2024-03-15T10:00:00.000Z"
 * Output: "20240315T100000Z"
 */
function formatIcsDateTime(isoString: string): string {
  // Remove milliseconds, dashes, colons
  return isoString
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z")
    .replace(/\.\d+\+/, "+");
}

/**
 * Escapes special characters in ICS text values.
 * Per RFC 5545: backslash, semicolons, commas, and newlines must be escaped.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generates a unique identifier for the ICS event.
 * Format: timestamp-random@get-slot.app
 */
function generateUid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${random}@get-slot.app`;
}
