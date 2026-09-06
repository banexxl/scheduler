import { describe, expect, it } from "vitest";
import { fromMinutes, toMinutes, isDurationUnit } from "./duration-unit";

describe("toMinutes", () => {
     it("returns the value unchanged for minutes", () => {
          expect(toMinutes(90, "minutes")).toBe(90);
     });

     it("converts days to minutes", () => {
          expect(toMinutes(1, "days")).toBe(1440);
          expect(toMinutes(3, "days")).toBe(4320);
     });

     it("rounds fractional inputs", () => {
          expect(toMinutes(1.5, "days")).toBe(2160);
          expect(toMinutes(90.4, "minutes")).toBe(90);
     });

     it("handles non-finite input safely", () => {
          expect(toMinutes(Number.NaN, "days")).toBe(0);
     });
});

describe("fromMinutes", () => {
     it("prefers days for whole-day values", () => {
          expect(fromMinutes(1440)).toEqual({ value: 1, unit: "days" });
          expect(fromMinutes(4320)).toEqual({ value: 3, unit: "days" });
     });

     it("uses minutes for non-day values", () => {
          expect(fromMinutes(90)).toEqual({ value: 90, unit: "minutes" });
          expect(fromMinutes(1500)).toEqual({ value: 1500, unit: "minutes" });
     });

     it("returns minutes for zero", () => {
          expect(fromMinutes(0)).toEqual({ value: 0, unit: "minutes" });
     });

     it("round-trips day values", () => {
          const { value, unit } = fromMinutes(2880);
          expect(toMinutes(value, unit)).toBe(2880);
     });
});

describe("isDurationUnit", () => {
     it("accepts valid units", () => {
          expect(isDurationUnit("minutes")).toBe(true);
          expect(isDurationUnit("days")).toBe(true);
     });

     it("rejects invalid values", () => {
          expect(isDurationUnit("hours")).toBe(false);
          expect(isDurationUnit(null)).toBe(false);
          expect(isDurationUnit(5)).toBe(false);
     });
});
