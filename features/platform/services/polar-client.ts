import "server-only";

import { getPolarEnvironment } from "./polar-config";
import {
     normalizePolarProduct,
     type UnknownRecord,
} from "./polar-normalize";
import type { NormalizedPolarPrice, NormalizedPolarProduct } from "../types/billing";

type PolarListResponse<T> = {
     items?: T[];
     result?: T[];
     data?: T[];
};

export class PolarApiError extends Error {
     readonly status: number;
     readonly statusText: string;

     constructor(status: number, statusText: string, message: string) {
          super(message);
          this.status = status;
          this.statusText = statusText;
     }
}

async function polarFetch<T>(path: string, init?: RequestInit): Promise<T> {
     const env = getPolarEnvironment();
     if (!env.accessToken) {
          throw new Error("[polar-client] Polar billing is not configured. Add POLAR_ACCESS_TOKEN to the environment.");
     }

     const url = `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

     const response = await fetch(url, {
          ...init,
          headers: {
               Authorization: `Bearer ${env.accessToken}`,
               Accept: "application/json",
               ...(init?.headers ?? {}),
          },
          cache: "no-store",
     });

     if (!response.ok) {
          const body = await response.text();
          throw new PolarApiError(
               response.status,
               response.statusText,
               `[polar-client] Request failed (${response.status}) ${response.statusText}: ${body.slice(
                    0,
                    300
               )}`
          );
     }

     const contentType = response.headers.get("content-type") ?? "";
     if (!contentType.includes("application/json")) {
          const body = await response.text();
          throw new PolarApiError(
               response.status,
               "Invalid Content-Type",
               `[polar-client] Expected JSON but got ${contentType}. URL: ${url}. Body: ${body.slice(0, 200)}`
          );
     }

     return (await response.json()) as T;
}

function extractObject(payload: unknown): UnknownRecord {
     if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
          return payload as UnknownRecord;
     }
     return {};
}

function extractFirst<T>(payload: unknown): T | null {
     const object = extractObject(payload);
     if (object.data && typeof object.data === "object") {
          return object.data as T;
     }
     if (object.result && typeof object.result === "object") {
          return object.result as T;
     }
     return (payload as T) ?? null;
}

function extractList<T>(payload: PolarListResponse<T> | T[]): T[] {
     if (Array.isArray(payload)) return payload;
     return payload.items ?? payload.result ?? payload.data ?? [];
}

function createQueryString(params: Record<string, string | number | null | undefined>) {
     const query = new URLSearchParams();
     for (const [key, value] of Object.entries(params)) {
          if (value === null || value === undefined) continue;
          query.set(key, String(value));
     }
     const result = query.toString();
     return result ? `?${result}` : "";
}

export async function listPolarProducts(): Promise<NormalizedPolarProduct[]> {
     const payload = await polarFetch<PolarListResponse<UnknownRecord>>(
          "/v1/products"
     );
     const rows = extractList(payload);
     return rows.map((row) => normalizePolarProduct(row));
}

export async function listPolarProductPrices(
     productId: string
): Promise<NormalizedPolarPrice[]> {
     // Polar no longer exposes a standalone `/v1/products/{id}/prices` endpoint
     // (it returns 404); prices are embedded in the product resource. Fetch the
     // product and normalize its embedded price list.
     const payload = await polarFetch<UnknownRecord>(`/v1/products/${productId}`);
     const product = normalizePolarProduct(payload);
     return product.prices;
}

export async function listPolarDiscounts(): Promise<Array<Record<string, unknown>>> {
     const payload = await polarFetch<PolarListResponse<Record<string, unknown>>>(
          "/v1/discounts"
     );
     return extractList(payload) as Array<Record<string, unknown>>;
}

// ─── Polar Product CRUD ──────────────────────────────────────────────────────

export type CreatePolarProductInput = {
     name: string;
     description?: string | null;
     isRecurring: boolean;
     recurringInterval?: "month" | "year" | null;
     recurringIntervalCount?: number;
     priceAmount: number; // minor units (cents)
     priceCurrency: string; // e.g., "usd"
     trialDays?: number | null;
     metadata?: Record<string, unknown>;
};

export type PolarProductResult = {
     productId: string;
     priceId: string;
     createdAt: string;
};

export async function createPolarProduct(input: CreatePolarProductInput): Promise<PolarProductResult> {
     // Build price payload
     const price: Record<string, unknown> = {
          type: input.isRecurring ? "recurring" : "one_time",
          amount_type: "fixed",
          price_amount: input.priceAmount,
          price_currency: input.priceCurrency,
     };

     if (input.isRecurring && input.recurringInterval) {
          price.recurring_interval = input.recurringInterval;
          price.recurring_interval_count = input.recurringIntervalCount ?? 1;
     }

     // Polar requires the org's default presentment currency (USD) to be present.
     // If the selected currency isn't USD, add a USD price as well.
     const prices: Array<Record<string, unknown>> = [price];
     if (input.priceCurrency.toLowerCase() !== "usd") {
          const usdPrice: Record<string, unknown> = {
               type: input.isRecurring ? "recurring" : "one_time",
               amount_type: "fixed",
               price_amount: input.priceAmount, // Same amount in USD as fallback
               price_currency: "usd",
          };
          if (input.isRecurring && input.recurringInterval) {
               usdPrice.recurring_interval = input.recurringInterval;
               usdPrice.recurring_interval_count = input.recurringIntervalCount ?? 1;
          }
          prices.push(usdPrice);
     }

     // Build product payload
     const productPayload: Record<string, unknown> = {
          name: input.name,
          prices,
          metadata: {
               ...(input.metadata ?? {}),
               ...(input.description ? { description: input.description } : {}),
          },
     };

     if (input.description) productPayload.description = input.description;

     // Set product-level recurring interval (Polar uses this at the product level)
     if (input.isRecurring && input.recurringInterval) {
          productPayload.recurring_interval = input.recurringInterval;
          productPayload.recurring_interval_count = input.recurringIntervalCount ?? 1;
     }

     // Add trial period if specified (Polar uses interval-based trials)
     if (input.trialDays && input.trialDays > 0) {
          productPayload.trial_interval = "day";
          productPayload.trial_interval_count = input.trialDays;
     }

     const response = await polarFetch<Record<string, unknown>>("/v1/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productPayload),
     });

     const productId = String(response.id ?? "");
     if (!productId) throw new Error("[polar-client] Product create response missing id");

     // Extract price ID from the API response (Polar returns the product with populated prices)
     const responsePrices = Array.isArray(response.prices) ? response.prices : [];
     const firstPrice = responsePrices[0] as Record<string, unknown> | undefined;
     const priceId = String(firstPrice?.id ?? "");

     return {
          productId,
          priceId,
          createdAt: String(response.created_at ?? new Date().toISOString()),
     };
}

export async function updatePolarProduct(
     polarProductId: string,
     input: { name?: string; description?: string | null; isArchived?: boolean }
): Promise<void> {
     const payload: Record<string, unknown> = {};
     if (input.name !== undefined) payload.name = input.name;
     if (input.description !== undefined) payload.description = input.description;
     if (input.isArchived !== undefined) payload.is_archived = input.isArchived;

     await polarFetch<unknown>(`/v1/products/${polarProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
     });
}

export type UpdatePolarPricingInput = {
     /** New price in minor units (cents). */
     priceAmount: number;
     /** Currency, e.g. "usd". */
     priceCurrency: string;
     /** Whether the product is recurring — locked at creation, passed through as-is. */
     isRecurring: boolean;
     /** Recurring interval — locked at creation, passed through as-is. */
     recurringInterval?: "month" | "year" | null;
     recurringIntervalCount?: number;
     /** Trial days (product-level). 0/undefined clears the trial. */
     trialDays?: number | null;
};

/**
 * Update a product's pricing on Polar.
 *
 * Polar prices are immutable and the pricing *model* (recurring vs one-time,
 * interval) is locked at creation. Sending a new `prices` array on the product
 * PATCH archives the old price(s) and creates the new one; existing subscribers
 * are grandfathered onto their original price, so this only affects new
 * purchases. The billing type/interval are passed through unchanged.
 */
export async function updatePolarProductPricing(
     polarProductId: string,
     input: UpdatePolarPricingInput
): Promise<void> {
     const buildPrice = (currency: string): Record<string, unknown> => {
          const price: Record<string, unknown> = {
               type: input.isRecurring ? "recurring" : "one_time",
               amount_type: "fixed",
               price_amount: input.priceAmount,
               price_currency: currency,
          };
          if (input.isRecurring && input.recurringInterval) {
               price.recurring_interval = input.recurringInterval;
               price.recurring_interval_count = input.recurringIntervalCount ?? 1;
          }
          return price;
     };

     // Mirror createPolarProduct: Polar requires a USD price to be present.
     const prices: Array<Record<string, unknown>> = [buildPrice(input.priceCurrency)];
     if (input.priceCurrency.toLowerCase() !== "usd") {
          prices.push(buildPrice("usd"));
     }

     const payload: Record<string, unknown> = { prices };

     // Trial is a product-level field. Send it so it can be set or cleared.
     if (input.trialDays && input.trialDays > 0) {
          payload.trial_interval = "day";
          payload.trial_interval_count = input.trialDays;
     } else {
          payload.trial_interval = null;
          payload.trial_interval_count = null;
     }

     await polarFetch<unknown>(`/v1/products/${polarProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
     });
}

export async function archivePolarProduct(polarProductId: string): Promise<void> {
     await polarFetch<unknown>(`/v1/products/${polarProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_archived: true }),
     });
}

export async function getPolarProduct(polarProductId: string): Promise<Record<string, unknown>> {
     return await polarFetch<Record<string, unknown>>(`/v1/products/${polarProductId}`);
}

export async function createPolarCheckoutSession(input: {
     productId: string;
     priceId: string;
     successUrl: string;
     returnUrl: string;
     externalCustomerId: string;
     metadata: Record<string, unknown>;
}): Promise<{
     checkoutId: string;
     checkoutUrl: string;
     status: string | null;
     expiresAt: string | null;
     createdAt: string | null;
     modifiedAt: string | null;
}> {
     const payload = await polarFetch<unknown>("/v1/checkouts", {
          method: "POST",
          headers: {
               "Content-Type": "application/json",
          },
          body: JSON.stringify({
               product_id: input.productId,
               price_id: input.priceId,
               success_url: input.successUrl,
               return_url: input.returnUrl,
               external_customer_id: input.externalCustomerId,
               metadata: input.metadata,
          }),
     });

     const checkout = extractObject(extractFirst<UnknownRecord>(payload));
     const id = String(checkout.id ?? "").trim();
     const url = String(checkout.url ?? checkout.checkout_url ?? "").trim();

     if (!id || !url) {
          throw new Error("[polar-client] Checkout session response missing id/url");
     }

     return {
          checkoutId: id,
          checkoutUrl: url,
          status:
               typeof checkout.status === "string" ? checkout.status : null,
          expiresAt:
               typeof checkout.expires_at === "string" ? checkout.expires_at : null,
          createdAt:
               typeof checkout.created_at === "string" ? checkout.created_at : null,
          modifiedAt:
               typeof checkout.modified_at === "string"
                    ? checkout.modified_at
                    : typeof checkout.updated_at === "string"
                         ? checkout.updated_at
                         : null,
     };
}

export async function createPolarCustomerPortalSession(input: {
     returnUrl: string;
     polarCustomerId?: string | null;
     externalCustomerId?: string | null;
}): Promise<{ portalUrl: string }> {
     const payload = await polarFetch<unknown>("/v1/customer-portal/sessions", {
          method: "POST",
          headers: {
               "Content-Type": "application/json",
          },
          body: JSON.stringify({
               return_url: input.returnUrl,
               customer_id: input.polarCustomerId ?? undefined,
               external_customer_id: input.externalCustomerId ?? undefined,
          }),
     });

     const session = extractObject(extractFirst<UnknownRecord>(payload));
     const portalUrl = String(session.url ?? session.portal_url ?? "").trim();

     if (!portalUrl) {
          throw new Error("[polar-client] Customer portal response missing URL");
     }

     return { portalUrl };
}

export async function getPolarSubscription(subscriptionId: string): Promise<UnknownRecord> {
     const payload = await polarFetch<unknown>(`/v1/subscriptions/${subscriptionId}`);
     const subscription = extractObject(extractFirst<UnknownRecord>(payload));

     if (!subscription.id || typeof subscription.id !== "string") {
          throw new Error("[polar-client] Subscription response missing id");
     }

     return subscription;
}

export async function listPolarSubscriptions(input?: {
     customerId?: string | null;
     status?: string | null;
     limit?: number;
     cursor?: string | null;
}): Promise<UnknownRecord[]> {
     const query = createQueryString({
          customer_id: input?.customerId ?? null,
          status: input?.status ?? null,
          limit: input?.limit ?? null,
          cursor: input?.cursor ?? null,
     });

     const payload = await polarFetch<PolarListResponse<UnknownRecord>>(`/v1/subscriptions${query}`);
     return extractList(payload).map((row) => extractObject(row));
}

export async function listPolarCustomerSubscriptions(input: {
     polarCustomerId: string;
     limit?: number;
     cursor?: string | null;
}): Promise<UnknownRecord[]> {
     return listPolarSubscriptions({
          customerId: input.polarCustomerId,
          limit: input.limit,
          cursor: input.cursor ?? null,
     });
}

export async function getPolarCustomer(polarCustomerId: string): Promise<UnknownRecord> {
     const payload = await polarFetch<unknown>(`/v1/customers/${polarCustomerId}`);
     const customer = extractObject(extractFirst<UnknownRecord>(payload));

     if (!customer.id || typeof customer.id !== "string") {
          throw new Error("[polar-client] Customer response missing id");
     }

     return customer;
}

export async function findPolarCustomerByExternalId(
     externalCustomerId: string
): Promise<UnknownRecord | null> {
     const query = createQueryString({ external_id: externalCustomerId, limit: 10 });
     const payload = await polarFetch<PolarListResponse<UnknownRecord>>(`/v1/customers${query}`);
     const rows = extractList(payload).map((row) => extractObject(row));

     const match = rows.find(
          (row) =>
               typeof row.external_id === "string" &&
               row.external_id.toLowerCase() === externalCustomerId.toLowerCase()
     );

     return match ?? null;
}
