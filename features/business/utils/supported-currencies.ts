export type SupportedCurrency = {
  code: string;
  name: string;
};

/**
 * Supported currencies for business creation.
 * Ordered alphabetically by code.
 */
export const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = [
  { code: "AUD", name: "Australian Dollar" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "RON", name: "Romanian Leu" },
  { code: "RSD", name: "Serbian Dinar" },
  { code: "USD", name: "US Dollar" },
] as const;

/**
 * Set of valid currency codes for quick validation.
 */
export const SUPPORTED_CURRENCY_CODES: ReadonlySet<string> = new Set(
  SUPPORTED_CURRENCIES.map((c) => c.code)
);
