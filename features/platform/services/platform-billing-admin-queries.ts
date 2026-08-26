import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
     classifyCheckoutEligibility,
     type UnknownRecord,
} from "./polar-normalize";
import { listPolarProductPrices, listPolarProducts } from "./polar-client";
import type {
     DiscoveredPolarProduct,
     PlanPriceSummary,
     PlatformSubscriptionListItem,
     PlatformBillingPlanSummary,
     PolarProductDiscoveryResult,
} from "../types/platform-billing-admin";

function asRecord(value: unknown): UnknownRecord {
     if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return value as UnknownRecord;
     }
     return {};
}

function deriveSubscriptionAccessState(
     row: Record<string, unknown>
): PlatformSubscriptionListItem["accessState"] {
     const status = String(row.status ?? "").trim().toLowerCase();
     const cancelAtPeriodEnd = Boolean(row.cancel_at_period_end);
     const hasTrialEnd = typeof row.trial_ends_at === "string" && row.trial_ends_at.length > 0;
     const hasCurrentPeriodEnd =
          typeof row.current_period_ends_at === "string" && row.current_period_ends_at.length > 0;

     if (status === "incomplete") return "pending";
     if (status === "incomplete_expired") return "revoked";
     if (status === "trialing") {
          return cancelAtPeriodEnd || hasTrialEnd ? "ending" : "trial";
     }
     if (status === "active") {
          return cancelAtPeriodEnd || hasCurrentPeriodEnd ? "ending" : "active";
     }
     if (status === "past_due") return "grace_period";
     if (status === "canceled" || status === "unpaid") return "revoked";
     return "revoked";
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
               description: typeof row.description === "string" ? row.description : null,
               isFree: Boolean(row.is_free),
               isActive: Boolean(row.is_active),
               isPublic: Boolean(row.is_public),
               sortOrder: Number(row.sort_order ?? 0),
               polarProductId:
                    typeof row.polar_product_id === "string" ? row.polar_product_id : null,
               activePriceCount: 0,
               archivedPriceCount: 0,
               trialDays: typeof row.trial_days === "number" ? row.trial_days : null,
               prices: [] as PlanPriceSummary[],
               lastSyncedAt:
                    typeof row.last_synced_at === "string" ? row.last_synced_at : null,
          })) ?? [];

     if (rows.length === 0) return [];

     const planIds = rows.map((row) => row.id);
     const { data: prices, error: priceError } = await adminClient
          .from("billing_plan_prices" as never)
          .select("billing_plan_id,is_active,is_archived,amount,currency,billing_interval,billing_interval_count,price_type,is_recurring")
          .in("billing_plan_id" as never, planIds as never);

     if (priceError) {
          throw new Error(
               `[platform-billing] Unable to load price counters: ${priceError.message}`
          );
     }

     const counters = new Map<string, { active: number; archived: number }>();
     const priceDetails = new Map<string, PlanPriceSummary[]>();

     for (const price of (prices as Array<Record<string, unknown>> | null) ?? []) {
          const planId = String(price.billing_plan_id ?? "");
          if (!planId) continue;
          const entry = counters.get(planId) ?? { active: 0, archived: 0 };

          if (Boolean(price.is_archived)) {
               entry.archived += 1;
          } else if (Boolean(price.is_active)) {
               entry.active += 1;

               // Collect active price details for display
               const details = priceDetails.get(planId) ?? [];
               details.push({
                    amount: typeof price.amount === "number" ? price.amount : null,
                    currency: typeof price.currency === "string" ? price.currency : null,
                    billingInterval: typeof price.billing_interval === "string" ? price.billing_interval : null,
                    billingIntervalCount: typeof price.billing_interval_count === "number" ? price.billing_interval_count : null,
                    priceType: String(price.price_type ?? "unknown"),
                    isRecurring: Boolean(price.is_recurring) || String(price.price_type ?? "") === "recurring",
               });
               priceDetails.set(planId, details);
          }

          counters.set(planId, entry);
     }

     return rows.map((row) => ({
          ...row,
          activePriceCount: counters.get(row.id)?.active ?? 0,
          archivedPriceCount: counters.get(row.id)?.archived ?? 0,
          prices: priceDetails.get(row.id) ?? [],
     }));
}

export async function getPlatformBillingDashboardMetrics() {
     const [plans, webhookRows, syncRows, subscriptionCounts] = await Promise.all([
          listPlatformBillingPlanSummaries(),
          listBillingWebhookDiagnostics(100),
          listRecentBillingSyncRuns(1),
          getPlatformSubscriptionStatusCounts(),
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
          trialSubscriptions: subscriptionCounts.trial,
          activeSubscriptions: subscriptionCounts.active,
          pastDueSubscriptions: subscriptionCounts.pastDue,
          endingSubscriptions: subscriptionCounts.ending,
          revokedSubscriptions: subscriptionCounts.revoked,
          subscriptionsRequiringMapping: subscriptionCounts.requiresMapping,
          staleSubscriptionSyncs: subscriptionCounts.stale,
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

export async function listPlatformSubscriptions(input?: {
     polarStatus?: string;
     accessState?: string;
     planId?: string;
     pastDueOnly?: boolean;
     scheduledCancellationOnly?: boolean;
     mappingIssueOnly?: boolean;
     staleOnly?: boolean;
     limit?: number;
}): Promise<PlatformSubscriptionListItem[]> {
     const adminClient = createAdminClient();
     const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);

     let query = adminClient
          .from("tenant_subscriptions" as never)
          .select(
               "id,tenant_id,polar_subscription_id,polar_customer_id,polar_product_id,polar_price_id,status,billing_interval,billing_interval_count,current_period_ends_at,cancel_at_period_end,trial_ends_at,last_synced_at,status,billing_plans(name,plan_key),tenants(name,slug)"
          )
          .order("last_synced_at" as never, { ascending: false })
          .limit(limit);

     if (input?.polarStatus) {
          query = query.eq("status" as never, input.polarStatus);
     }
     if (input?.planId) {
          query = query.eq("billing_plan_id" as never, input.planId);
     }
     if (input?.pastDueOnly) {
          query = query.eq("status" as never, "past_due");
     }
     if (input?.scheduledCancellationOnly) {
          query = query.eq("cancel_at_period_end" as never, true);
     }
     if (input?.mappingIssueOnly) {
          query = query.eq("status " as never, "requires_mapping");
     }
     if (input?.staleOnly) {
          query = query.eq("status " as never, "stale_event");
     }

     const { data, error } = await query;
     if (error) {
          throw new Error(`[platform-billing] Unable to load subscriptions: ${error.message}`);
     }

     const rows = ((data as Array<Record<string, unknown>> | null) ?? []).filter((row) => {
          if (!input?.accessState) return true;
          return deriveSubscriptionAccessState(row) === input.accessState;
     });

     return rows.map((row) => {
          const tenant = asRecord(row.tenants);
          const plan = asRecord(row.billing_plans);

          return {
               id: String(row.id ?? ""),
               tenantId: String(row.tenant_id ?? ""),
               tenantName: typeof tenant.name === "string" ? tenant.name : null,
               tenantSlug: typeof tenant.slug === "string" ? tenant.slug : null,
               polarSubscriptionId: String(row.polar_subscription_id ?? ""),
               polarCustomerId: String(row.polar_customer_id ?? ""),
               polarProductId: String(row.polar_product_id ?? ""),
               polarPriceId:
                    typeof row.polar_price_id === "string" ? row.polar_price_id : null,
               planName: typeof plan.name === "string" ? plan.name : null,
               planKey: typeof plan.plan_key === "string" ? plan.plan_key : null,
               status: String(row.status ?? "unknown") as PlatformSubscriptionListItem["status"],
               accessState: deriveSubscriptionAccessState(row),
               billingInterval:
                    typeof row.billing_interval === "string" ? row.billing_interval : null,
               billingIntervalCount:
                    typeof row.billing_interval_count === "number"
                         ? row.billing_interval_count
                         : null,
               currentPeriodEnd:
                    typeof row.current_period_ends_at === "string" ? row.current_period_ends_at : null,
               cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
               trialEnd: typeof row.trial_ends_at === "string" ? row.trial_ends_at : null,
               lastSyncedAt: String(row.last_synced_at ?? ""),
               syncStatus: String(row.status ?? "synced"),
          };
     });
}

export async function getPlatformSubscriptionDetail(subscriptionId: string) {
     const adminClient = createAdminClient();

     const [subscriptionResult, historyResult, relatedWebhookResult] = await Promise.all([
          adminClient
               .from("tenant_subscriptions" as never)
               .select(
                    "*, tenants(name,slug), billing_plans(name,plan_key), billing_plan_prices(amount,currency,billing_interval,billing_interval_count), tenant_billing_customers(external_id,email,name)"
               )
               .eq("id" as never, subscriptionId)
               .maybeSingle(),
          adminClient
               .from("billing_subscription_state_history" as never)
               .select("*")
               .eq("tenant_subscription_id" as never, subscriptionId)
               .order("effective_at" as never, { ascending: false })
               .limit(100),
          adminClient
               .from("billing_webhook_events" as never)
               .select("id,polar_event_id,event_type,event_timestamp,status,last_error_code,last_error_message")
               .eq("resource_id" as never, subscriptionId)
               .order("event_timestamp" as never, { ascending: false })
               .limit(50),
     ]);

     if (subscriptionResult.error) {
          throw new Error(
               `[platform-billing] Unable to load subscription detail: ${subscriptionResult.error.message}`
          );
     }

     const subscription =
          (subscriptionResult.data as Record<string, unknown> | null) ?? null;

     let checkoutCorrelation: Record<string, unknown> | null = null;
     const polarCheckoutId =
          typeof subscription?.polar_checkout_id === "string"
               ? String(subscription.polar_checkout_id)
               : null;

     if (polarCheckoutId) {
          const checkoutResult = await adminClient
               .from("billing_checkout_sessions" as never)
               .select("id,status,request_key,created_at")
               .eq("polar_checkout_id" as never, polarCheckoutId)
               .maybeSingle();

          checkoutCorrelation =
               (checkoutResult.data as Record<string, unknown> | null) ?? null;
     }

     return {
          subscription,
          checkoutCorrelation,
          history:
               (historyResult.data as Array<Record<string, unknown>> | null) ?? [],
          relatedWebhookEvents:
               (relatedWebhookResult.data as Array<Record<string, unknown>> | null) ?? [],
     };
}

export async function getPlatformSubscriptionStatusCounts() {
     const adminClient = createAdminClient();

     const { data, error } = await adminClient
          .from("tenant_subscriptions" as never)
          .select("status,status ,cancel_at_period_end,current_period_ends_at,trial_ends_at");

     if (error) {
          throw new Error(
               `[platform-billing] Unable to load subscription counts: ${error.message}`
          );
     }

     let trial = 0;
     let active = 0;
     let pastDue = 0;
     let ending = 0;
     let revoked = 0;
     let requiresMapping = 0;
     let stale = 0;

     for (const row of (data as Array<Record<string, unknown>> | null) ?? []) {
          const accessState = deriveSubscriptionAccessState(row);
          const status = String(row.status ?? "");
          const syncStatus = String(row.status ?? "");

          if (accessState === "trial") trial += 1;
          if (accessState === "active") active += 1;
          if (status === "past_due") pastDue += 1;
          if (accessState === "ending") ending += 1;
          if (accessState === "revoked") revoked += 1;
          if (syncStatus === "requires_mapping") requiresMapping += 1;
          if (syncStatus === "stale_event") stale += 1;
     }

     return {
          trial,
          active,
          pastDue,
          ending,
          revoked,
          requiresMapping,
          stale,
     };
}

export async function listPlatformSubscriptionMappingFailures(limit = 100) {
     return listPlatformSubscriptions({ mappingIssueOnly: true, limit });
}

export async function listPlatformStaleSubscriptions(limit = 100) {
     return listPlatformSubscriptions({ staleOnly: true, limit });
}
