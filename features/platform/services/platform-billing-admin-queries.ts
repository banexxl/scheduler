import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
     classifyCheckoutEligibility,
     type UnknownRecord,
} from "./polar-normalize";
import { listPolarProductPrices, listPolarProducts } from "./polar-client";
import type {
     DiscoveredPolarProduct,
     PlatformBillingPlanSummary,
     PolarProductDiscoveryResult,
} from "../types/platform-billing-admin";

function asRecord(value: unknown): UnknownRecord {
     if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return value as UnknownRecord;
     }
     return {};
}

export async function listPlatformBillingPlanSummaries(): Promise<
     PlatformBillingPlanSummary[]
> {
     const adminClient = createAdminClient();
     const { data: plans, error } = await adminClient
          .from("billing_plans" as never)
          .select("*")
          .order("sort_order" as never, { ascending: true });

     if (error) {
          throw new Error(`[platform-billing] Unable to load plans: ${error.message}`);
     }

     const rows =
          (plans as Array<Record<string, unknown>> | null)?.map((row) => ({
               id: String(row.id),
               planKey: String(row.plan_key),
               name: String(row.name),
               isFree: Boolean(row.is_free),
               isActive: Boolean(row.is_active),
               isPublic: Boolean(row.is_public),
               sortOrder: Number(row.sort_order ?? 0),
               polarProductId:
                    typeof row.polar_product_id === "string" ? row.polar_product_id : null,
               activePriceCount: 0,
               archivedPriceCount: 0,
               lastSyncedAt:
                    typeof row.last_synced_at === "string" ? row.last_synced_at : null,
          })) ?? [];

     if (rows.length === 0) return [];

     const planIds = rows.map((row) => row.id);
     const { data: prices, error: priceError } = await adminClient
          .from("billing_plan_prices" as never)
          .select("billing_plan_id,is_active,is_archived")
          .in("billing_plan_id" as never, planIds as never);

     if (priceError) {
          throw new Error(
               `[platform-billing] Unable to load price counters: ${priceError.message}`
          );
     }

     const counters = new Map<string, { active: number; archived: number }>();

     for (const price of (prices as Array<Record<string, unknown>> | null) ?? []) {
          const planId = String(price.billing_plan_id ?? "");
          if (!planId) continue;
          const entry = counters.get(planId) ?? { active: 0, archived: 0 };

          if (Boolean(price.is_archived)) {
               entry.archived += 1;
          } else if (Boolean(price.is_active)) {
               entry.active += 1;
          }

          counters.set(planId, entry);
     }

     return rows.map((row) => ({
          ...row,
          activePriceCount: counters.get(row.id)?.active ?? 0,
          archivedPriceCount: counters.get(row.id)?.archived ?? 0,
     }));
}

export async function getPlatformBillingDashboardMetrics() {
     const [plans, webhookRows, syncRows] = await Promise.all([
          listPlatformBillingPlanSummaries(),
          listBillingWebhookDiagnostics(100),
          listRecentBillingSyncRuns(1),
     ]);

     const activePlans = plans.filter((plan) => plan.isActive).length;
     const mappedProducts = plans.filter((plan) => Boolean(plan.polarProductId)).length;
     const unmappedProducts = plans.filter(
          (plan) => !plan.isFree && !plan.polarProductId
     ).length;
     const activePrices = plans.reduce((sum, row) => sum + row.activePriceCount, 0);
     const archivedPrices = plans.reduce((sum, row) => sum + row.archivedPriceCount, 0);
     const pendingWebhookEvents = webhookRows.filter(
          (row) => row.status === "pending" || row.status === "processing"
     ).length;
     const failedWebhookEvents = webhookRows.filter(
          (row) => row.status === "failed"
     ).length;

     return {
          activeTenants: await countActiveTenants(),
          activeBillingPlans: activePlans,
          mappedPolarProducts: mappedProducts,
          unmappedPolarProducts: unmappedProducts,
          activeSynchronizedPrices: activePrices,
          archivedPrices,
          pendingWebhookEvents,
          failedWebhookEvents,
          lastProductReconciliation:
               syncRows[0]?.started_at && typeof syncRows[0].started_at === "string"
                    ? syncRows[0].started_at
                    : null,
     };
}

async function countActiveTenants(): Promise<number> {
     const adminClient = createAdminClient();
     const { count, error } = await adminClient
          .from("tenants" as never)
          .select("id", { count: "exact", head: true })
          .eq("status" as never, "active");

     if (error) {
          throw new Error(`[platform-billing] Unable to count active tenants: ${error.message}`);
     }

     return count ?? 0;
}

export async function discoverPolarProductsForMapping(): Promise<PolarProductDiscoveryResult> {
     const [polarProducts, plans] = await Promise.all([
          listPolarProducts(),
          listPlatformBillingPlanSummaries(),
     ]);

     const mapByProductId = new Map<string, string>();
     for (const plan of plans) {
          if (plan.polarProductId) {
               mapByProductId.set(plan.polarProductId, plan.id);
          }
     }

     const discovered: DiscoveredPolarProduct[] = [];

     for (const product of polarProducts) {
          const priceRows =
               product.prices.length > 0
                    ? product.prices
                    : await listPolarProductPrices(product.id);

          discovered.push({
               id: product.id,
               name: product.name,
               description: product.description,
               metadata: asRecord(product.metadata),
               isMapped: mapByProductId.has(product.id),
               mappedPlanId: mapByProductId.get(product.id) ?? null,
               prices: priceRows.map((price) => ({
                    id: price.id,
                    amount: price.unitAmount,
                    currency: price.currency,
                    billingInterval: price.recurringInterval,
                    billingIntervalCount: price.recurringIntervalCount,
                    priceType: price.type,
                    isRecurring: price.isRecurring,
                    isArchived: price.isArchived,
                    isCheckoutEligible: classifyCheckoutEligibility(price),
               })),
          });
     }

     return {
          products: discovered,
          mappedCount: discovered.filter((row) => row.isMapped).length,
          unmappedCount: discovered.filter((row) => !row.isMapped).length,
     };
}

export async function listBillingWebhookDiagnostics(limit = 50) {
     const adminClient = createAdminClient();
     const safeLimit = Math.min(Math.max(1, limit), 200);

     const { data, error } = await adminClient
          .from("billing_webhook_events" as never)
          .select(
               "id, polar_event_id, event_type, resource_id, status, attempt_count, created_at, processed_at, last_error_code, last_error_message, processing_worker_id"
          )
          .order("created_at" as never, { ascending: false })
          .limit(safeLimit);

     if (error) {
          throw new Error(
               `[platform-billing] Unable to load webhook diagnostics: ${error.message}`
          );
     }

     return (data as Array<Record<string, unknown>> | null) ?? [];
}

export async function listRecentBillingSyncRuns(limit = 10) {
     const adminClient = createAdminClient();
     const safeLimit = Math.min(Math.max(1, limit), 100);

     const { data, error } = await adminClient
          .from("billing_sync_runs" as never)
          .select("id,run_type,sync_source,status,started_at,completed_at,details")
          .order("started_at" as never, { ascending: false })
          .limit(safeLimit);

     if (error) {
          throw new Error(`[platform-billing] Unable to load sync runs: ${error.message}`);
     }

     return (data as Array<Record<string, unknown>> | null) ?? [];
}
