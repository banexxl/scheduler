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
          throw new Error(
               `[polar-client] Request failed (${response.status}) ${response.statusText}: ${body.slice(
                    0,
                    300
               )}`
          );
     }

     return (await response.json()) as T;
}

function extractList<T>(payload: PolarListResponse<T> | T[]): T[] {
     if (Array.isArray(payload)) return payload;
     return payload.items ?? payload.result ?? payload.data ?? [];
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
