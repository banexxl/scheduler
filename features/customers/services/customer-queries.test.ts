import { describe, expect, it } from "vitest";
import { parseCustomerTags, getCustomerStatusLabel } from "./customer-queries";

describe("parseCustomerTags", () => {
     it("splits comma-separated tags and trims whitespace", () => {
          expect(parseCustomerTags("VIP, repeat,  follow-up ")).toEqual(["VIP", "repeat", "follow-up"]);
     });

     it("returns an empty list for empty values", () => {
          expect(parseCustomerTags("   ")).toEqual([]);
          expect(parseCustomerTags(null)).toEqual([]);
     });
});

describe("getCustomerStatusLabel", () => {
     it("marks blocked profiles distinctly", () => {
          expect(getCustomerStatusLabel({ isBlocked: true, hasUpcomingAppointments: false })).toBe("Blocked");
     });

     it("uses appointment activity when the profile is active", () => {
          expect(getCustomerStatusLabel({ isBlocked: false, hasUpcomingAppointments: true })).toBe("Upcoming");
          expect(getCustomerStatusLabel({ isBlocked: false, hasUpcomingAppointments: false })).toBe("Active");
     });
});
