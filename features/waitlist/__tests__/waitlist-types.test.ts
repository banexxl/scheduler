/**
 * Waitlist Types Tests — Milestone 8.8.
 */

import { describe, it, expect } from "vitest";
import { WAITLIST_ENTRY_STATUSES, WAITLIST_OFFER_STATUSES } from "../types/waitlist";

describe("waitlist constants", () => {
  it("has 5 entry statuses", () => {
    expect(WAITLIST_ENTRY_STATUSES).toHaveLength(5);
    expect(WAITLIST_ENTRY_STATUSES).toContain("active");
    expect(WAITLIST_ENTRY_STATUSES).toContain("matched");
    expect(WAITLIST_ENTRY_STATUSES).toContain("booked");
    expect(WAITLIST_ENTRY_STATUSES).toContain("expired");
    expect(WAITLIST_ENTRY_STATUSES).toContain("cancelled");
  });

  it("has 6 offer statuses", () => {
    expect(WAITLIST_OFFER_STATUSES).toHaveLength(6);
    expect(WAITLIST_OFFER_STATUSES).toContain("pending");
    expect(WAITLIST_OFFER_STATUSES).toContain("notified");
    expect(WAITLIST_OFFER_STATUSES).toContain("accepted");
    expect(WAITLIST_OFFER_STATUSES).toContain("expired");
    expect(WAITLIST_OFFER_STATUSES).toContain("cancelled");
    expect(WAITLIST_OFFER_STATUSES).toContain("stale");
  });
});
