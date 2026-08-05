import { SUPPORTED_CURRENCY_CODES } from "./supported-currencies";

/**
 * Detects a sensible default currency based on the browser locale.
 *
 * Mapping:
 *   sr-* → RSD
 *   ro-* → RON
 *   bg-* → BGN
 *   en-US → USD
 *   en-GB → GBP
 *   en-AU → AUD
 *   en-CA → CAD
 *   de-CH, fr-CH, it-CH → CHF
 *   otherwise → EUR
 *
 * This is client-only. Do not import in Server Components.
 */
export function getDefaultCurrency(): string {
  try {
    const locale = navigator.language || "";
    const lower = locale.toLowerCase();

    if (lower.startsWith("sr")) return "RSD";
    if (lower.startsWith("ro")) return "RON";
    if (lower.startsWith("bg")) return "BGN";
    if (lower === "en-us") return "USD";
    if (lower === "en-gb") return "GBP";
    if (lower === "en-au") return "AUD";
    if (lower === "en-ca") return "CAD";
    if (lower.endsWith("-ch")) return "CHF";

    // Try to use Intl.NumberFormat to detect currency
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
    }).resolvedOptions();
    // Some browsers expose the locale's native currency via resolvedOptions
    // but this is not standardized, so we fall through to EUR
    void parts;
  } catch {
    // Detection not available
  }

  return "EUR";
}

/**
 * Returns the default currency, ensuring it's one of the supported codes.
 * Falls back to EUR if the detected currency is not supported.
 */
export function getSafeDefaultCurrency(): string {
  const detected = getDefaultCurrency();
  return SUPPORTED_CURRENCY_CODES.has(detected) ? detected : "EUR";
}
