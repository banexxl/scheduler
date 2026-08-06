import "server-only";

import { getPolarEnvironment } from "./polar-config";
import {
     normalizePolarPrice,
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
     const payload = await polarFetch<PolarListResponse<UnknownRecord>>(
          `/v1/products/${productId}/prices`
     );
     const rows = extractList(payload);
     return rows.map((row) => normalizePolarPrice(row, productId));
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
