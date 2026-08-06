import { describe, expect, it } from "vitest";
import { formatMinorCurrency } from "@/lib/helpers/format-minor-currency";

describe("formatMinorCurrency", () => {
     it("formats minor units with currency code", () => {
          expect(formatMinorCurrency(1999, "USD")).toContain("USD");
     });

     it("returns dash when amount is null", () => {
          expect(formatMinorCurrency(null, "USD")).toBe("-");
     });

     it("handles invalid currency", () => {
          expect(formatMinorCurrency(1234, "XX")).toBe("12.34 XX");
     });
});
