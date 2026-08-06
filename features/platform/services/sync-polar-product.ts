import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
     classifyCheckoutEligibility,
     normalizePolarProduct,
     type UnknownRecord,
} from "./polar-normalize";
import {
     listPolarProductPrices,
     listPolarProducts,
} from "./polar-client";
import type {
     BillingSyncSource,
     BillingSyncRunType,
     NormalizedPolarPrice,
     NormalizedPolarProduct,
     SyncProductResult,
} from "../types/billing";

type SyncOptions = {
     source: BillingSyncSource;
     runType: BillingSyncRunType;
     requestedBy?: string;
};

function toIsoOrNull(value: string | null): string | null {
     if (!value) return null;
     const date = new Date(value);
     if (Number.isNaN(date.getTime())) return null;
     return date.toISOString();
}

function extractPlanKeyFromMetadata(metadata: Record<string, unknown>): string | null {
     const keys = ["plan_key", "planKey", "scheduler_plan_key"];
     for (const key of keys) {
          const value = metadata[key];
          if (typeof value === "string" && value.trim().length > 0) {
               return value.trim().toLowerCase();
          }
     }
     return null;
}

async function getOrCreateSyncRun(params: {
     runType: BillingSyncRunType;
     source: BillingSyncSource;
     requestedBy?: string;
}): Promise<string | null> {
     const adminClient = createAdminClient();
     const { data, error } = await adminClient
          .from("billing_sync_runs" as never)
          .insert(
               {
                    run_type: params.runType,
                    sync_source: params.source,
                    requested_by: params.requestedBy ?? null,
                    status: "running",
               } as never
          )
          .select("id")
          .single();

     if (error) {
          console.error("[billing-sync] Unable to create sync run", error.message);
          return null;
     }

     return (data as { id: string }).id;
}

async function finalizeSyncRun(params: {
     runId: string | null;
     status: "completed" | "failed";
     counters: Record<string, number>;
     details?: Record<string, unknown>;
}) {
     if (!params.runId) return;

     const adminClient = createAdminClient();
     await adminClient
          .from("billing_sync_runs" as never)
          .update(
               {
                    status: params.status,
                    completed_at: new Date().toISOString(),
                    ...params.counters,
                    details: params.details ?? {},
               } as never
          )
          .eq("id" as never, params.runId);
}

async function resolvePlanIdForProduct(
     product: NormalizedPolarProduct
): Promise<{ planId: string | null; stale: boolean }> {
     const adminClient = createAdminClient();

     const { data: byProduct } = await adminClient
          .from("billing_plans" as never)
          .select("id, polar_modified_at")
          .eq("polar_product_id" as never, product.id)
          .maybeSingle();

     if (byProduct) {
          const currentModifiedAt = toIsoOrNull(
               (byProduct as { polar_modified_at: string | null }).polar_modified_at
          );
          const incomingModifiedAt = toIsoOrNull(product.modifiedAt);
          const stale =
               Boolean(currentModifiedAt) &&
               Boolean(incomingModifiedAt) &&
               currentModifiedAt! > incomingModifiedAt!;

          return {
               planId: (byProduct as { id: string }).id,
               stale,
          };
     }

     const mappedPlanKey = extractPlanKeyFromMetadata(product.metadata);
     if (!mappedPlanKey) {
          return { planId: null, stale: false };
     }

     const { data: byPlanKey } = await adminClient
          .from("billing_plans" as never)
          .select("id")
          .eq("plan_key" as never, mappedPlanKey)
          .maybeSingle();

     return { planId: ((byPlanKey as { id: string } | null)?.id ?? null), stale: false };
}

async function syncPrices(params: {
     planId: string;
     product: NormalizedPolarProduct;
     prices: NormalizedPolarPrice[];
}): Promise<{ created: number; updated: number; archived: number }> {
     const adminClient = createAdminClient();

     const { data: existingRows } = await adminClient
          .from("billing_plan_prices" as never)
          .select("id, polar_price_id")
          .eq("billing_plan_id" as never, params.planId);

     const existing = (existingRows as Array<{ id: string; polar_price_id: string }> | null) ?? [];
     const existingByPolarPriceId = new Map(existing.map((row) => [row.polar_price_id, row]));

     let created = 0;
     let updated = 0;

     for (const price of params.prices) {
          const payload = {
               billing_plan_id: params.planId,
               polar_product_id: params.product.id,
               polar_price_id: price.id,
               price_type: price.type,
               billing_interval: price.recurringInterval,
               billing_interval_count: price.recurringIntervalCount,
               amount: price.unitAmount,
               currency: price.currency,
               is_recurring: price.isRecurring,
               is_checkout_eligible: classifyCheckoutEligibility(price),
               is_active: !price.isArchived,
               is_archived: price.isArchived,
               price_metadata: price.metadata,
               polar_created_at: toIsoOrNull(price.createdAt),
               polar_modified_at: toIsoOrNull(price.modifiedAt),
               last_synced_at: new Date().toISOString(),
          };

          const exists = existingByPolarPriceId.has(price.id);
          const { error } = await adminClient
               .from("billing_plan_prices" as never)
               .upsert(payload as never, { onConflict: "polar_price_id" });

          if (error) {
               throw new Error(`[billing-sync] Price upsert failed (${price.id}): ${error.message}`);
          }

          if (exists) updated++;
          else created++;
     }

     const incomingIds = new Set(params.prices.map((price) => price.id));
     const archiveIds = existing
          .filter((row) => !incomingIds.has(row.polar_price_id))
          .map((row) => row.id);

     if (archiveIds.length > 0) {
          const { error } = await adminClient
               .from("billing_plan_prices" as never)
               .update(
                    {
                         is_active: false,
                         is_archived: true,
                         last_synced_at: new Date().toISOString(),
                    } as never
               )
               .in("id" as never, archiveIds as never);

          if (error) {
               throw new Error(`[billing-sync] Price archive failed: ${error.message}`);
          }
     }

     return { created, updated, archived: archiveIds.length };
}

export async function syncPolarProduct(
     productLike: UnknownRecord | NormalizedPolarProduct,
     source: BillingSyncSource
): Promise<SyncProductResult> {
     const adminClient = createAdminClient();
     const product =
          "prices" in productLike
               ? (productLike as NormalizedPolarProduct)
               : normalizePolarProduct(productLike as UnknownRecord);

     const resolution = await resolvePlanIdForProduct(product);
     if (!resolution.planId) {
          return {
               status: "unmapped",
               productId: product.id,
               planId: null,
               pricesCreated: 0,
               pricesUpdated: 0,
               pricesArchived: 0,
          };
     }

     if (resolution.stale) {
          return {
               status: "skipped_stale",
               productId: product.id,
               planId: resolution.planId,
               pricesCreated: 0,
               pricesUpdated: 0,
               pricesArchived: 0,
          };
     }

     const { error: planError } = await adminClient
          .from("billing_plans" as never)
          .update(
               {
                    polar_product_id: product.id,
                    polar_product_name: product.name,
                    polar_product_description: product.description,
                    is_active: !product.isArchived,
                    product_metadata: product.metadata,
                    polar_created_at: toIsoOrNull(product.createdAt),
                    polar_modified_at: toIsoOrNull(product.modifiedAt),
                    last_synced_at: new Date().toISOString(),
               } as never
          )
          .eq("id" as never, resolution.planId);

     if (planError) {
          throw new Error(`[billing-sync] Plan update failed (${product.id}): ${planError.message}`);
     }

     const priceList =
          product.prices.length > 0 ? product.prices : await listPolarProductPrices(product.id);

     const priceResult = await syncPrices({
          planId: resolution.planId,
          product,
          prices: priceList,
     });

     console.log("[billing-sync] Product synced", {
          productId: product.id,
          planId: resolution.planId,
          source,
          pricesCreated: priceResult.created,
          pricesUpdated: priceResult.updated,
          pricesArchived: priceResult.archived,
     });

     return {
          status: "synced",
          productId: product.id,
          planId: resolution.planId,
          pricesCreated: priceResult.created,
          pricesUpdated: priceResult.updated,
          pricesArchived: priceResult.archived,
     };
}

export async function syncAllPolarProducts(options: SyncOptions) {
     const runId = await getOrCreateSyncRun({
          runType: options.runType,
          source: options.source,
          requestedBy: options.requestedBy,
     });

     const counters = {
          products_seen: 0,
          products_synced: 0,
          products_unmapped: 0,
          products_conflict: 0,
          products_failed: 0,
          prices_created: 0,
          prices_updated: 0,
          prices_archived: 0,
     };

     try {
          const products = await listPolarProducts();
          counters.products_seen = products.length;

          for (const product of products) {
               try {
                    const result = await syncPolarProduct(product, options.source);

                    if (result.status === "synced") {
                         counters.products_synced += 1;
                         counters.prices_created += result.pricesCreated;
                         counters.prices_updated += result.pricesUpdated;
                         counters.prices_archived += result.pricesArchived;
                    } else if (result.status === "unmapped") {
                         counters.products_unmapped += 1;
                    } else if (result.status === "skipped_stale") {
                         counters.products_conflict += 1;
                    }
               } catch (error) {
                    counters.products_failed += 1;
                    console.error("[billing-sync] Product sync failed", {
                         productId: product.id,
                         error: error instanceof Error ? error.message : "unknown",
                    });
               }
          }

          await finalizeSyncRun({
               runId,
               status: "completed",
               counters,
          });

          return counters;
     } catch (error) {
          await finalizeSyncRun({
               runId,
               status: "failed",
               counters,
               details: {
                    error: error instanceof Error ? error.message : "unknown",
               },
          });

          throw error;
     }
}

export async function reconcilePolarProducts(requestedBy?: string) {
     return syncAllPolarProducts({
          source: "scheduled_reconciliation",
          runType: "reconciliation",
          requestedBy,
     });
}
