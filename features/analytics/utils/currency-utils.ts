/**
 * Analytics Currency Utilities — Milestone 15.9.
 *
 * Helpers for currency-safe financial aggregation.
 * Critical invariant: different currencies are NEVER summed together.
 */

import type { CurrencyAmount } from "../types/advanced-analytics";

/**
 * Groups financial amounts by currency.
 * Input: array of { currency, amount } pairs.
 * Output: deduplicated array with amounts summed per currency.
 */
export function groupByCurrency(items: CurrencyAmount[]): CurrencyAmount[] {
  const map = new Map<string, number>();

  for (const item of items) {
    const existing = map.get(item.currency) ?? 0;
    map.set(item.currency, existing + item.amount);
  }

  return Array.from(map.entries())
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * Formats a minor-unit amount for display.
 * Example: 42000 RSD → "42,000 RSD"
 * Example: 1240 EUR → "12.40 EUR" (assuming 2 decimal currencies)
 *
 * Uses Intl.NumberFormat for locale-safe formatting.
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  // Minor unit currencies with 0 decimals
  const zeroDecimalCurrencies = ["RSD", "JPY", "KRW", "CLP", "VND", "HUF", "ISK"];

  const isZeroDecimal = zeroDecimalCurrencies.includes(currency.toUpperCase());
  const displayAmount = isZeroDecimal ? amount : amount / 100;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(displayAmount);
  } catch {
    // Fallback for unknown currencies
    return `${displayAmount.toLocaleString()} ${currency.toUpperCase()}`;
  }
}

/**
 * Returns a safe display value for a percentage.
 * Avoids NaN, Infinity, and excessive precision.
 */
export function safePercentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  const result = (numerator / denominator) * 100;
  if (!isFinite(result)) return null;
  return Math.round(result * 10) / 10;
}

/**
 * Returns safe rate (0–1 scale) for ratios.
 */
export function safeRate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  const result = numerator / denominator;
  if (!isFinite(result)) return null;
  return Math.round(result * 1000) / 1000; // 3 decimal places
}
