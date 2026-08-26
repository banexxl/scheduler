import type { NormalizedPolarPrice, NormalizedPolarProduct } from "../types/billing";

export type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
     if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return value as UnknownRecord;
     }
     return {};
}

function asString(value: unknown): string | null {
     if (typeof value === "string" && value.trim().length > 0) {
          return value.trim();
     }
     return null;
}

function asNumber(value: unknown): number | null {
     if (typeof value === "number" && Number.isFinite(value)) return value;
     if (typeof value === "string" && value.trim().length > 0) {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : null;
     }
     return null;
}

function asBoolean(value: unknown): boolean {
     return value === true;
}

function toIsoTimestamp(value: unknown): string | null {
     const raw = asString(value);
     if (!raw) return null;

     const date = new Date(raw);
     if (Number.isNaN(date.getTime())) {
          return null;
     }
     return date.toISOString();
}

function extractPriceAmount(payload: UnknownRecord): number | null {
     const direct = asNumber(payload.amount);
     if (direct !== null) return direct;

     const unitAmount = asNumber(payload.unit_amount);
     if (unitAmount !== null) return unitAmount;

     const priceAmount = asNumber(payload.price_amount);
     if (priceAmount !== null) return priceAmount;

     const nested = asRecord(payload.price);
     return asNumber(nested.amount ?? nested.unit_amount ?? nested.price_amount);
}

function extractPriceCurrency(payload: UnknownRecord): string | null {
     const direct = asString(payload.currency);
     if (direct) return direct.toUpperCase();

     const priceCurrency = asString(payload.price_currency);
     if (priceCurrency) return priceCurrency.toUpperCase();

     const nested = asRecord(payload.price);
     const value = asString(nested.currency) ?? asString(nested.price_currency);
     return value ? value.toUpperCase() : null;
}

function extractRecurring(payload: UnknownRecord): {
     interval: string | null;
     intervalCount: number | null;
     isRecurring: boolean;
} {
     const recurring = asRecord(payload.recurring_interval ? payload : payload.recurring);

     const interval =
          asString(payload.recurring_interval) ??
          asString(recurring.interval) ??
          asString(recurring.recurring_interval);

     const intervalCount =
          asNumber(payload.recurring_interval_count) ??
          asNumber(recurring.interval_count) ??
          asNumber(recurring.recurring_interval_count);

     // Polar prices have a `type` field of "recurring" or "one_time"
     const typeField = asString(payload.type);
     const isRecurring = Boolean(interval) || typeField === "recurring";

     return {
          interval,
          intervalCount,
          isRecurring,
     };
}

export function normalizePolarPrice(
     payload: UnknownRecord,
     fallbackProductId: string
): NormalizedPolarPrice {
     const recurring = extractRecurring(payload);
     const metadata = asRecord(payload.metadata);

     return {
          id: asString(payload.id) ?? `unknown-price-${Date.now()}`,
          productId:
               asString(payload.product_id) ?? asString(asRecord(payload.product).id) ?? fallbackProductId,
          type: asString(payload.type) ?? "unknown",
          recurringInterval: recurring.interval,
          recurringIntervalCount: recurring.intervalCount,
          unitAmount: extractPriceAmount(payload),
          currency: extractPriceCurrency(payload),
          isRecurring: recurring.isRecurring,
          isArchived: asBoolean(payload.is_archived) || asBoolean(payload.archived),
          metadata,
          createdAt: toIsoTimestamp(payload.created_at),
          modifiedAt: toIsoTimestamp(payload.modified_at ?? payload.updated_at),
     };
}

function normalizePriceList(
     payload: UnknownRecord,
     productId: string
): NormalizedPolarPrice[] {
     const candidates = [payload.prices, payload.price, payload.price_list];
     const priceList = candidates.find((value) => Array.isArray(value));
     if (!Array.isArray(priceList)) return [];

     return priceList
          .map((entry) => normalizePolarPrice(asRecord(entry), productId))
          .filter((price) => price.id.length > 0);
}

export function normalizePolarProduct(payload: UnknownRecord): NormalizedPolarProduct {
     const metadata = asRecord(payload.metadata);
     const productId = asString(payload.id) ?? "";
     const recurring = extractRecurring(payload);

     return {
          id: productId,
          name: asString(payload.name) ?? "Unnamed product",
          description: asString(payload.description),
          isArchived: asBoolean(payload.is_archived) || asBoolean(payload.archived),
          isRecurring: recurring.isRecurring,
          recurringInterval: recurring.interval,
          recurringIntervalCount: recurring.intervalCount,
          trialInterval: asString(payload.trial_interval),
          trialIntervalCount: asNumber(payload.trial_interval_count),
          metadata,
          createdAt: toIsoTimestamp(payload.created_at),
          modifiedAt: toIsoTimestamp(payload.modified_at ?? payload.updated_at),
          prices: normalizePriceList(payload, productId),
     };
}

export function classifyCheckoutEligibility(price: NormalizedPolarPrice): boolean {
     if (price.isArchived) return false;
     if (price.unitAmount === null || price.unitAmount < 0) return false;
     if (!price.currency || price.currency.length !== 3) return false;
     if (!price.isRecurring) return false;

     const interval = (price.recurringInterval ?? "").toLowerCase();
     const supportedInterval =
          interval === "month" || interval === "year" || interval === "week";

     if (!supportedInterval) return false;

     if (!price.recurringIntervalCount || price.recurringIntervalCount < 1) return false;

     return true;
}

export function normalizeWebhookEventType(value: string): string {
     return value.trim().toLowerCase().replace(/_/g, ".");
}

export function extractWebhookResourceId(payload: UnknownRecord): string | null {
     return (
          asString(payload.resource_id) ??
          asString(asRecord(payload.data).id) ??
          asString(asRecord(payload.product).id) ??
          null
     );
}

export function extractWebhookEventTimestamp(payload: UnknownRecord): string {
     const candidates = [
          payload.timestamp,
          payload.created_at,
          payload.occurred_at,
          payload.event_timestamp,
     ];

     for (const value of candidates) {
          const iso = toIsoTimestamp(value);
          if (iso) return iso;
     }

     return new Date().toISOString();
}
