/**
 * Customer Account Types Tests — Milestone 9.1.
 */

import { describe, it, expect } from "vitest";
import { LINK_STATUSES, LINK_METHODS } from "../types/customer-account";

describe("customer account constants", () => {
  it("has 4 link statuses", () => {
    expect(LINK_STATUSES).toHaveLength(4);
    expect(LINK_STATUSES).toContain("pending");
    expect(LINK_STATUSES).toContain("linked");
    expect(LINK_STATUSES).toContain("revoked");
    expect(LINK_STATUSES).toContain("conflict");
  });

  it("has 5 link methods", () => {
    expect(LINK_METHODS).toHaveLength(5);
    expect(LINK_METHODS).toContain("account_registration");
    expect(LINK_METHODS).toContain("verified_email");
    expect(LINK_METHODS).toContain("portal_session");
    expect(LINK_METHODS).toContain("appointment_claim");
    expect(LINK_METHODS).toContain("manual_support");
  });
});
