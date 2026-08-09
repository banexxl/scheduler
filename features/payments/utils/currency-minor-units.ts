/**
 * Currency Minor-Unit Utilities — Milestone 11.1.
 *
 * Converts between display amounts and integer minor-unit representation.
 * Does NOT assume all currencies have 2 decimal places.
 */

// ─── Currency Exponent Table ─────────────────────────────────────────────────

/**
 * ISO 4217 currency exponents (number of minor-unit digits).
 * Most currencies use 2, some use 0 or 3.
 */
const CURRENCY_EXPONENTS: Record<string, number> = {
  // Zero-decimal currencies
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  // Three-decimal currencies
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  // Common two-decimal currencies (default)
  // EUR, USD, GBP, CHF, AUD, CAD, RSD, etc. all use 2
};

/**
 * Returns the number of minor-unit digits for a currency.
 * Defaults to 2 for unlisted currencies (most common case).
 */
export function getCurrencyExponent(currency: string): number {
  return CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2;
}

// ─── Conversion ──────────────────────────────────────────────────────────────

/**
 * Converts a display amount (e.g., 30.00) to integer minor units (e.g., 3000).
 * Uses currency exponent for correct scaling.
 */
export function toMinorUnits(displayAmount: number, currency: string): number {
  const exponent = getCurrencyExponent(currency);
  const factor = Math.pow(10, exponent);
  return Math.round(displayAmount * factor);
}

/**
 * Converts integer minor units (e.g., 3000) to display amount (e.g., 30.00).
 */
export function fromMinorUnits(minorUnits: number, currency: string): number {
  const exponent = getCurrencyExponent(currency);
  const factor = Math.pow(10, exponent);
  return minorUnits / factor;
}

/**
 * Formats minor units as a human-readable string with currency code.
 * Example: 3000, "EUR" → "30.00 EUR"
 */
export function formatMinorUnits(minorUnits: number, currency: string): string {
  const exponent = getCurrencyExponent(currency);
  const displayAmount = fromMinorUnits(minorUnits, currency);
  return `${displayAmount.toFixed(exponent)} ${currency}`;
}

/**
 * Validates a currency code format (3 uppercase letters).
 */
export function isValidCurrencyCode(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency);
}
