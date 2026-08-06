export function formatMinorCurrency(
     amountMinor: number | null,
     currency: string | null
): string {
     if (amountMinor === null || !currency) return "-";

     const normalizedCurrency = currency.toUpperCase();
     if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
          return `${(amountMinor / 100).toFixed(2)} ${currency}`;
     }

     try {
          return new Intl.NumberFormat("en-US", {
               style: "currency",
               currency: normalizedCurrency,
               currencyDisplay: "code",
               minimumFractionDigits: 2,
               maximumFractionDigits: 2,
          }).format(amountMinor / 100);
     } catch {
          return `${(amountMinor / 100).toFixed(2)} ${normalizedCurrency}`;
     }
}
