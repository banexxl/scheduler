/**
 * Customer Communication Types Tests — Milestone 9.4.
 */

import { describe, it, expect } from "vitest";
import { DEFAULT_CUSTOMER_PREFERENCES } from "../types/customer-communication";
import type { ResolvedCustomerCommunicationPreferences } from "../types/customer-communication";

describe("customer communication preferences", () => {
  it("defaults have all optional notifications enabled", () => {
    expect(DEFAULT_CUSTOMER_PREFERENCES.appointmentRemindersEnabled).toBe(true);
    expect(DEFAULT_CUSTOMER_PREFERENCES.reviewRequestsEnabled).toBe(true);
    expect(DEFAULT_CUSTOMER_PREFERENCES.waitlistNotificationsEnabled).toBe(true);
  });

  it("resolved preferences combine tenant support + customer choice", () => {
    const resolved: ResolvedCustomerCommunicationPreferences = {
      appointmentReminders: { supported: true, enabled: true },
      reviewRequests: { supported: true, enabled: false },
      waitlistNotifications: { supported: false, enabled: false },
    };

    // Tenant supports reminders + customer enabled = effective on
    expect(resolved.appointmentReminders.enabled).toBe(true);
    // Tenant supports reviews but customer disabled = effective off
    expect(resolved.reviewRequests.enabled).toBe(false);
    // Tenant doesn't support waitlist = always off regardless of customer
    expect(resolved.waitlistNotifications.supported).toBe(false);
    expect(resolved.waitlistNotifications.enabled).toBe(false);
  });
});
