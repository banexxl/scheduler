import { describe, expect, it } from "vitest";
import {
     checkoutCreationSchema,
     checkoutReturnQuerySchema,
     customerPortalSessionSchema,
} from "@/features/platform/schemas/tenant-billing-schema";

describe("checkoutCreationSchema", () => {
     it("accepts uuid payload", async () => {
          const value = await checkoutCreationSchema.validate({
               billingPlanPriceId: "11111111-1111-4111-8111-111111111111",
               requestKey: "22222222-2222-4222-8222-222222222222",
          });

          expect(value.requestKey).toBe("22222222-2222-4222-8222-222222222222");
     });

     it("rejects invalid request key", async () => {
          await expect(
               checkoutCreationSchema.validate({
                    billingPlanPriceId: "11111111-1111-4111-8111-111111111111",
                    requestKey: "bad",
               })
          ).rejects.toBeTruthy();
     });
});

describe("checkoutReturnQuerySchema", () => {
     it("accepts empty object", async () => {
          const value = await checkoutReturnQuerySchema.validate({});
          expect(value).toEqual({});
     });
});

describe("customerPortalSessionSchema", () => {
     it("accepts open intent", async () => {
          const value = await customerPortalSessionSchema.validate({ intent: "open" });
          expect(value.intent).toBe("open");
     });
});
