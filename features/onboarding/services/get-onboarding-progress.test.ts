import { describe, expect, it } from "vitest";
import { resolveOnboardingProgress } from "./get-onboarding-progress";

describe("resolveOnboardingProgress", () => {
     it("returns an empty progress state for a new tenant", () => {
          const progress = resolveOnboardingProgress({
               currentStep: "business_details",
               status: "not_started",
               tenant: { name: "", defaultTimezone: "UTC", defaultCurrency: "USD" },
               locations: [],
               resources: [],
               services: [],
               locationHours: [],
               resourceHours: [],
               bookingRules: null,
               publicBookingSettings: null,
               plan: { canUsePublicBooking: false },
          });

          expect(progress.status).toBe("not_started");
          expect(progress.currentStep).toBe("business_details");
          expect(progress.completedSteps).toEqual([]);
          expect(progress.remainingSteps).toContain("business_details");
          expect(progress.percentComplete).toBe(0);
          expect(progress.canComplete).toBe(false);
     });

     it("marks the business step complete when tenant identity is present", () => {
          const progress = resolveOnboardingProgress({
               currentStep: "business_details",
               status: "in_progress",
               tenant: { name: "Northwind Studio", defaultTimezone: "America/New_York", defaultCurrency: "USD" },
               locations: [],
               resources: [],
               services: [],
               locationHours: [],
               resourceHours: [],
               bookingRules: null,
               publicBookingSettings: null,
               plan: { canUsePublicBooking: false },
          });

          expect(progress.completedSteps).toContain("business_details");
          expect(progress.remainingSteps).toContain("location");
     });

     it("allows completion when required steps are satisfied and public booking is skipped by plan", () => {
          const progress = resolveOnboardingProgress({
               currentStep: "complete",
               status: "in_progress",
               tenant: { name: "Northwind Studio", defaultTimezone: "America/New_York", defaultCurrency: "USD" },
               locations: [{ id: "1" }],
               resources: [{ id: "2" }],
               services: [{ id: "3" }],
               locationHours: [{ id: "4" }],
               resourceHours: [],
               bookingRules: { minimumNoticeMinutes: 60 },
               publicBookingSettings: null,
               plan: { canUsePublicBooking: false },
          });

          expect(progress.status).toBe("completed");
          expect(progress.canComplete).toBe(true);
          expect(progress.completedSteps).toEqual(expect.arrayContaining([
               "business_details",
               "location",
               "resource",
               "service",
               "working_hours",
               "booking_rules",
          ]));
          expect(progress.remainingSteps).toEqual([]);
     });
});
