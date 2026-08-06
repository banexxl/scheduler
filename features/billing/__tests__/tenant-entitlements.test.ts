import { describe, expect, it } from "vitest";
import { assertWithinLimit, getPlanLimit, hasFeature, resolveBillingState } from "../services/tenant-entitlements";

describe("tenant entitlements", () => {
     it("maps subscription states into the application billing state", () => {
          expect(resolveBillingState({ accessState: "trial", status: "trialing" })).toBe("trial");
          expect(resolveBillingState({ accessState: "active", status: "active" })).toBe("active");
          expect(resolveBillingState({ accessState: "grace_period", status: "past_due" })).toBe("grace_period");
          expect(resolveBillingState({ accessState: "revoked", status: "canceled" })).toBe("restricted");
     });

     it("returns feature flags from the effective plan entitlements", () => {
          const entitlements = {
               maxLocations: 5,
               maxResources: 10,
               maxServices: 20,
               maxTeamMembers: 5,
               publicBookingEnabled: true,
               emailNotificationsEnabled: true,
               appointmentRemindersEnabled: false,
               customerSelfServiceEnabled: false,
          };

          expect(hasFeature("public_booking", entitlements)).toBe(true);
          expect(hasFeature("appointment_reminders", entitlements)).toBe(false);
     });

     it("reports plan-limit violations with structured details", () => {
          const result = assertWithinLimit({ currentUsage: 10, planLimit: 10, resource: "resources" });

          expect(result).toEqual({
               success: false,
               code: "PLAN_LIMIT_REACHED",
               limit: 10,
               current: 10,
               resource: "resources",
          });
     });

     it("treats null limits as unlimited", () => {
          expect(getPlanLimit({ maxResources: null }, "maxResources")).toBeNull();
     });
});
