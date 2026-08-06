import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
     classifyCheckoutEligibility,
     normalizeWebhookEventType,
} from "@/features/platform/services/polar-normalize";
import { verifyPolarWebhookSignature } from "@/features/platform/services/polar-webhook-signature";

describe("classifyCheckoutEligibility", () => {
     it("returns true for active recurring monthly prices", () => {
          expect(
               classifyCheckoutEligibility({
                    id: "price_1",
                    productId: "prod_1",
                    type: "recurring",
                    recurringInterval: "month",
                    recurringIntervalCount: 1,
                    unitAmount: 1999,
                    currency: "USD",
                    isRecurring: true,
                    isArchived: false,
                    metadata: {},
                    createdAt: null,
                    modifiedAt: null,
               })
          ).toBe(true);
     });

     it("returns false for one-time prices", () => {
          expect(
               classifyCheckoutEligibility({
                    id: "price_2",
                    productId: "prod_1",
                    type: "one_time",
                    recurringInterval: null,
                    recurringIntervalCount: null,
                    unitAmount: 499,
                    currency: "USD",
                    isRecurring: false,
                    isArchived: false,
                    metadata: {},
                    createdAt: null,
                    modifiedAt: null,
               })
          ).toBe(false);
     });
});

describe("verifyPolarWebhookSignature", () => {
     it("accepts valid sha256 signature", () => {
          const secret = "top-secret";
          const body = JSON.stringify({ id: "evt_1", type: "product.created" });
          const hex = createHmac("sha256", secret).update(body, "utf8").digest("hex");

          const ok = verifyPolarWebhookSignature({
               rawBody: body,
               signatureHeader: `sha256=${hex}`,
               secret,
          });

          expect(ok).toBe(true);
     });

     it("rejects invalid signature", () => {
          const ok = verifyPolarWebhookSignature({
               rawBody: "{}",
               signatureHeader: "sha256=deadbeef",
               secret: "top-secret",
          });

          expect(ok).toBe(false);
     });
});

describe("normalizeWebhookEventType", () => {
     it("normalizes underscore event names", () => {
          expect(normalizeWebhookEventType("PRODUCT_UPDATED")).toBe("product.updated");
     });
});
