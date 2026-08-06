import { describe, expect, it } from "vitest";
import {
     billingPlanUpsertSchema,
     productMappingSchema,
     webhookRetrySchema,
} from "@/features/platform/schemas/billing-plan-admin-schema";

describe("billingPlanUpsertSchema", () => {
     it("accepts valid payload", async () => {
          const value = await billingPlanUpsertSchema.validate({
               planKey: "starter-plus",
               name: "Starter Plus",
               description: "Plan description",
               isFree: false,
               isActive: true,
               isPublic: true,
               sortOrder: 10,
          });

          expect(value.planKey).toBe("starter-plus");
     });

     it("rejects invalid plan key", async () => {
          await expect(
               billingPlanUpsertSchema.validate({
                    planKey: "Starter Plus",
                    name: "Starter Plus",
                    isFree: false,
                    isActive: true,
                    isPublic: true,
                    sortOrder: 10,
               })
          ).rejects.toBeTruthy();
     });
});

describe("productMappingSchema", () => {
     it("accepts null for unmapping", async () => {
          const value = await productMappingSchema.validate({
               planId: "00000000-0000-4000-8000-000000000000",
               polarProductId: null,
          });

          expect(value.polarProductId).toBeNull();
     });
});

describe("webhookRetrySchema", () => {
     it("rejects non-uuid event id", async () => {
          await expect(
               webhookRetrySchema.validate({ eventId: "abc" })
          ).rejects.toBeTruthy();
     });
});
