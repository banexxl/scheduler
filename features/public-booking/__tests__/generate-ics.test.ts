/**
 * ICS Generation Unit Tests — Milestone 15.12.
 */

import { describe, it, expect } from "vitest";
import { generateIcsContent } from "../utils/generate-ics";

describe("generateIcsContent", () => {
  it("generates valid ICS structure", () => {
    const result = generateIcsContent({
      title: "Massage at Acme Spa",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T11:00:00Z",
      location: "123 Main St",
      description: "60-minute massage",
      organizerName: "Acme Spa",
    });

    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("END:VCALENDAR");
    expect(result).toContain("BEGIN:VEVENT");
    expect(result).toContain("END:VEVENT");
    expect(result).toContain("VERSION:2.0");
    expect(result).toContain("PRODID:-//get-slot//Appointment Booking//EN");
  });

  it("formats datetime correctly", () => {
    const result = generateIcsContent({
      title: "Test",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T11:00:00Z",
    });

    expect(result).toContain("DTSTART:20240315T100000Z");
    expect(result).toContain("DTEND:20240315T110000Z");
  });

  it("handles datetime with milliseconds", () => {
    const result = generateIcsContent({
      title: "Test",
      startsAtUtc: "2024-03-15T10:00:00.000Z",
      endsAtUtc: "2024-03-15T11:00:00.000Z",
    });

    expect(result).toContain("DTSTART:20240315T100000Z");
    expect(result).toContain("DTEND:20240315T110000Z");
  });

  it("escapes special characters in text", () => {
    const result = generateIcsContent({
      title: "Service; with, special\\chars",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T11:00:00Z",
    });

    expect(result).toContain("SUMMARY:Service\\; with\\, special\\\\chars");
  });

  it("escapes newlines in description", () => {
    const result = generateIcsContent({
      title: "Test",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T11:00:00Z",
      description: "Line 1\nLine 2",
    });

    expect(result).toContain("DESCRIPTION:Line 1\\nLine 2");
  });

  it("includes location when provided", () => {
    const result = generateIcsContent({
      title: "Test",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T11:00:00Z",
      location: "456 Oak Ave",
    });

    expect(result).toContain("LOCATION:456 Oak Ave");
  });

  it("omits location when not provided", () => {
    const result = generateIcsContent({
      title: "Test",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T11:00:00Z",
    });

    expect(result).not.toContain("LOCATION:");
  });

  it("includes organizer when provided", () => {
    const result = generateIcsContent({
      title: "Test",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T11:00:00Z",
      organizerName: "My Business",
    });

    expect(result).toContain("ORGANIZER;CN=My Business");
  });

  it("generates unique UID for each event", () => {
    const result1 = generateIcsContent({
      title: "Test",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T11:00:00Z",
    });
    const result2 = generateIcsContent({
      title: "Test",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T11:00:00Z",
    });

    const uid1 = result1.match(/UID:(.+)/)?.[1];
    const uid2 = result2.match(/UID:(.+)/)?.[1];
    expect(uid1).not.toBe(uid2);
  });

  it("uses CRLF line endings per RFC 5545", () => {
    const result = generateIcsContent({
      title: "Test",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T11:00:00Z",
    });

    expect(result).toContain("\r\n");
  });

  it("sets STATUS:CONFIRMED", () => {
    const result = generateIcsContent({
      title: "Test",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T11:00:00Z",
    });

    expect(result).toContain("STATUS:CONFIRMED");
  });

  it("does not expose internal IDs or private notes", () => {
    const result = generateIcsContent({
      title: "Haircut at Salon",
      startsAtUtc: "2024-03-15T10:00:00Z",
      endsAtUtc: "2024-03-15T10:30:00Z",
      description: "Service: Haircut",
      location: "Main Branch",
    });

    expect(result).not.toContain("tenant_id");
    expect(result).not.toContain("appointment_id");
    expect(result).not.toContain("internal_notes");
  });
});
