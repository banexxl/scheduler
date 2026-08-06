import { describe, it, expect } from "vitest";
import { parseCalendarFilters } from "../schemas/calendar-query-schema";

const TODAY = "2026-08-06";

describe("parseCalendarFilters", () => {
  it("returns defaults for empty params", () => {
    const result = parseCalendarFilters({}, TODAY);
    expect(result.view).toBe("day");
    expect(result.date).toBe(TODAY);
    expect(result.locationId).toBeNull();
    expect(result.resourceId).toBeNull();
    expect(result.status).toBeNull();
  });

  it("accepts valid day view", () => {
    const result = parseCalendarFilters({ view: "day" }, TODAY);
    expect(result.view).toBe("day");
  });

  it("accepts valid week view", () => {
    const result = parseCalendarFilters({ view: "week" }, TODAY);
    expect(result.view).toBe("week");
  });

  it("falls back to day for invalid view", () => {
    const result = parseCalendarFilters({ view: "month" }, TODAY);
    expect(result.view).toBe("day");
  });

  it("accepts valid date", () => {
    const result = parseCalendarFilters({ date: "2026-09-15" }, TODAY);
    expect(result.date).toBe("2026-09-15");
  });

  it("falls back to today for invalid date format", () => {
    const result = parseCalendarFilters({ date: "not-a-date" }, TODAY);
    expect(result.date).toBe(TODAY);
  });

  it("falls back to today for impossible date", () => {
    const result = parseCalendarFilters({ date: "2026-02-30" }, TODAY);
    expect(result.date).toBe(TODAY);
  });

  it("accepts valid UUID for location", () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const result = parseCalendarFilters({ location: uuid }, TODAY);
    expect(result.locationId).toBe(uuid);
  });

  it("rejects invalid UUID for location", () => {
    const result = parseCalendarFilters({ location: "invalid" }, TODAY);
    expect(result.locationId).toBeNull();
  });

  it("accepts valid UUID for resource", () => {
    const uuid = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
    const result = parseCalendarFilters({ resource: uuid }, TODAY);
    expect(result.resourceId).toBe(uuid);
  });

  it("accepts valid status", () => {
    const result = parseCalendarFilters({ status: "confirmed" }, TODAY);
    expect(result.status).toBe("confirmed");
  });

  it("rejects invalid status", () => {
    const result = parseCalendarFilters({ status: "invalid_status" }, TODAY);
    expect(result.status).toBeNull();
  });

  it("accepts cancelled status", () => {
    const result = parseCalendarFilters({ status: "cancelled" }, TODAY);
    expect(result.status).toBe("cancelled");
  });

  it("handles all params together", () => {
    const result = parseCalendarFilters({
      view: "week",
      date: "2026-09-01",
      location: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      resource: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      status: "pending",
    }, TODAY);
    expect(result.view).toBe("week");
    expect(result.date).toBe("2026-09-01");
    expect(result.locationId).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(result.resourceId).toBe("b2c3d4e5-f6a7-8901-bcde-f12345678901");
    expect(result.status).toBe("pending");
  });
});
