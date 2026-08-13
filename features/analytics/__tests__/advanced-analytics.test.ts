import { describe, it, expect } from "vitest";
import { resolveAdvancedDateRange, resolveAdvancedComparisonRange, validateCustomRange, calculatePercentageChange, getChangeDirection } from "../services/advanced-date-ranges";
import { groupByCurrency, formatCurrencyAmount, safePercentage, safeRate } from "../utils/currency-utils";

/**
 * Advanced Analytics Unit Tests — Milestone 15.9.
 */

describe("advanced date ranges", () => {
  const tz = "Europe/Belgrade"; // UTC+1/+2
  const now = new Date("2026-06-15T10:00:00Z");

  describe("resolveAdvancedDateRange", () => {
    it("resolves 30days", () => {
      const range = resolveAdvancedDateRange("30days", now, tz);
      expect(range.label).toBe("Last 30 days");
      expect(new Date(range.start).getTime()).toBeLessThan(new Date(range.end).getTime());
    });

    it("resolves this_quarter", () => {
      const range = resolveAdvancedDateRange("this_quarter", now, tz);
      expect(range.label).toBe("This quarter");
    });

    it("resolves this_year", () => {
      const range = resolveAdvancedDateRange("this_year", now, tz);
      expect(range.label).toBe("This year");
    });

    it("resolves custom range", () => {
      const range = resolveAdvancedDateRange("custom", now, tz, "2026-01-01", "2026-06-15");
      expect(range.label).toContain("2026-01-01");
    });

    it("falls back to 30days for custom without dates", () => {
      const range = resolveAdvancedDateRange("custom", now, tz);
      expect(range.label).toBe("Last 30 days");
    });
  });

  describe("resolveAdvancedComparisonRange", () => {
    it("returns previous 30 days for 30days period", () => {
      const comp = resolveAdvancedComparisonRange("30days", now, tz);
      expect(comp).not.toBeNull();
      expect(comp!.label).toBe("Previous 30 days");
    });

    it("returns previous quarter for this_quarter", () => {
      const comp = resolveAdvancedComparisonRange("this_quarter", now, tz);
      expect(comp).not.toBeNull();
      expect(comp!.label).toBe("Previous quarter");
    });

    it("returns previous year for this_year", () => {
      const comp = resolveAdvancedComparisonRange("this_year", now, tz);
      expect(comp).not.toBeNull();
      expect(comp!.label).toBe("Previous year");
    });

    it("returns null for custom without dates", () => {
      const comp = resolveAdvancedComparisonRange("custom", now, tz);
      expect(comp).toBeNull();
    });
  });

  describe("validateCustomRange", () => {
    it("validates normal range", () => {
      expect(validateCustomRange("2026-01-01", "2026-06-01").valid).toBe(true);
    });

    it("rejects start >= end", () => {
      const result = validateCustomRange("2026-06-15", "2026-01-01");
      expect(result.valid).toBe(false);
    });

    it("rejects range exceeding 5 years", () => {
      const result = validateCustomRange("2020-01-01", "2026-06-01");
      expect(result.valid).toBe(false);
    });

    it("rejects invalid dates", () => {
      const result = validateCustomRange("not-a-date", "2026-06-01");
      expect(result.valid).toBe(false);
    });
  });
});

describe("percentage change", () => {
  it("calculates positive change", () => {
    expect(calculatePercentageChange(120, 100)).toBe(20);
  });

  it("calculates negative change", () => {
    expect(calculatePercentageChange(80, 100)).toBe(-20);
  });

  it("returns null when previous is 0", () => {
    expect(calculatePercentageChange(50, 0)).toBeNull();
  });

  it("returns null for both 0", () => {
    expect(calculatePercentageChange(0, 0)).toBeNull();
  });

  it("rounds to 1 decimal place", () => {
    expect(calculatePercentageChange(133, 100)).toBe(33);
  });
});

describe("getChangeDirection", () => {
  it("returns up for positive change", () => {
    expect(getChangeDirection(5)).toBe("up");
  });

  it("returns down for negative change", () => {
    expect(getChangeDirection(-5)).toBe("down");
  });

  it("returns flat for near-zero", () => {
    expect(getChangeDirection(0.3)).toBe("flat");
  });

  it("returns null for null", () => {
    expect(getChangeDirection(null)).toBeNull();
  });
});

describe("currency utilities", () => {
  describe("groupByCurrency", () => {
    it("groups and sums amounts by currency", () => {
      const result = groupByCurrency([
        { currency: "RSD", amount: 1000 },
        { currency: "EUR", amount: 500 },
        { currency: "RSD", amount: 2000 },
      ]);
      expect(result).toHaveLength(2);
      expect(result.find((r) => r.currency === "RSD")?.amount).toBe(3000);
      expect(result.find((r) => r.currency === "EUR")?.amount).toBe(500);
    });

    it("returns empty for empty input", () => {
      expect(groupByCurrency([])).toHaveLength(0);
    });

    it("sorts alphabetically by currency", () => {
      const result = groupByCurrency([
        { currency: "USD", amount: 100 },
        { currency: "EUR", amount: 200 },
        { currency: "RSD", amount: 300 },
      ]);
      expect(result[0]!.currency).toBe("EUR");
      expect(result[1]!.currency).toBe("RSD");
      expect(result[2]!.currency).toBe("USD");
    });
  });

  describe("formatCurrencyAmount", () => {
    it("formats RSD as zero-decimal", () => {
      const result = formatCurrencyAmount(42000, "RSD");
      expect(result).toContain("42,000");
    });

    it("formats EUR with 2 decimals", () => {
      const result = formatCurrencyAmount(1250, "EUR");
      expect(result).toContain("12.50") ;
    });
  });

  describe("safePercentage", () => {
    it("calculates normal percentage", () => {
      expect(safePercentage(25, 100)).toBe(25);
    });

    it("returns null for zero denominator", () => {
      expect(safePercentage(5, 0)).toBeNull();
    });
  });

  describe("safeRate", () => {
    it("calculates normal rate", () => {
      expect(safeRate(3, 10)).toBe(0.3);
    });

    it("returns null for zero denominator", () => {
      expect(safeRate(5, 0)).toBeNull();
    });
  });
});
