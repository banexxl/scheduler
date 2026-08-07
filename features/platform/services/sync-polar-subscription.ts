import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
     getPolarCustomer,
     getPolarSubscription,
} from "./polar-client";
import { resolveSubscriptionAccessState } from "./resolve-subscription-access-state";
import type {
     PolarSubscriptionStatus,
     SubscriptionAccessState,
} from "../types/subscription-access-state";
import type { PolarSubscriptionSyncResult, SubscriptionSyncSource } from "../types/subscription-sync";

type UnknownRecord = Record<string, unknown>;

type SyncInput = {
     polarSubscriptionId: string;
     payload?: UnknownRecord | null;
     eventId?: string | null;
     eventTimestamp?: string | null;
     source: SubscriptionSyncSource;
};

function asRecord(value: unknown): UnknownRecord {
     if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return value as UnknownRecord;
     }
     return {};
}

function asString(value: unknown): string | null {
     return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

function asPolarSubscriptionStatus(value: unknown): PolarSubscriptionStatus | null {
     const normalized = asString(value);
     if (!normalized) return null;
     switch (normalized) {
          case "incomplete":
          case "incomplete_expired":
          case "trialing":
          case "active":
          case "past_due":
          case "canceled":
          case "unpaid":
          case "unknown":
               return normalized;
          default:
               return "unknown";
     }
}

function asSubscriptionAccessState(value: unknown): SubscriptionAccessState | null {
     const normalized = asString(value);
     if (!normalized) return null;
     switch (normalized) {
          case "pending":
          case "trial":
          case "active":
          case "grace_period":
          case "ending":
          case "revoked":
               return normalized;
          default:
               return null;
     }
}

function toIso(value: unknown): string | null {
     const raw = asString(value);
     if (!raw) return null;
     const date = new Date(raw);
     return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseTenantIdFromExternalId(externalId: string | null): string | null {
     if (!externalId) return null;
     const match = /^tenant:([0-9a-fA-F-]{36})$/.exec(externalId);
     return match ? match[1]! : null;
}

function extractSubscriptionFromPayload(payload: UnknownRecord | null | undefined): UnknownRecord {
     if (!payload) return {};

     const data = asRecord(payload.data);
     if (Object.keys(data).length > 0) {
          const subscription = asRecord(data.subscription);
          if (Object.keys(subscription).length > 0) return subscription;
          return data;
     }

     return payload;
}

function normalizeSyncStatus(params: {
     hasCustomer: boolean;
     hasPlan: boolean;
     hasPrice: boolean;
     hasPriceId: boolean;
     conflict: boolean;
     stale: boolean;
}): "synced" | "requires_mapping" | "unresolved_customer" | "stale_event" | "conflict" {
     if (params.conflict) return "conflict";
     if (params.stale) return "stale_event";
     if (!params.hasCustomer) return "unresolved_customer";
     if (!params.hasPlan || (params.hasPriceId && !params.hasPrice)) return "requires_mapping";
     return "synced";
}

async function getCanonicalSubscription(input: SyncInput): Promise<UnknownRecord> {
     const fromPayload = extractSubscriptionFromPayload(input.payload ?? null);

     try {
          return await getPolarSubscription(input.polarSubscriptionId);
     } catch {
          if (Object.keys(fromPayload).length > 0) {
               return fromPayload;
          }
          throw new Error("Unable to fetch Polar subscription.");
     }
}

async function resolveTenantContext(params: {
     adminClient: ReturnType<typeof createAdminClient>;
     subscription: UnknownRecord;
     payload: UnknownRecord | null | undefined;
     polarCustomerId: string | null;
}): Promise<{
     tenantId: string | null;
     tenantBillingCustomerId: string | null;
     conflict: boolean;
     conflictReason?: string;
}> {
     const { adminClient, subscription, payload, polarCustomerId } = params;

     const candidates: Array<{ source: string; tenantId: string }> = [];

     const { data: existingSub } = await adminClient
          .from("tenant_subscriptions" as never)
          .select("tenant_id, tenant_billing_customer_id")
          .eq("polar_subscription_id" as never, asString(subscription.id) ?? "")
          .maybeSingle();

     let tenantBillingCustomerId: string | null = null;

     if (existingSub) {
          const tenantId = asString((existingSub as { tenant_id?: unknown }).tenant_id);
          tenantBillingCustomerId = asString(
               (existingSub as { tenant_billing_customer_id?: unknown }).tenant_billing_customer_id
          );
          if (tenantId) candidates.push({ source: "existing_subscription", tenantId });
     }

     if (polarCustomerId) {
          const { data: customerByPolar } = await adminClient
               .from("tenant_billing_customers" as never)
               .select("id, tenant_id")
               .eq("polar_customer_id" as never, polarCustomerId)
               .maybeSingle();

          if (customerByPolar) {
               const tenantId = asString((customerByPolar as { tenant_id?: unknown }).tenant_id);
               tenantBillingCustomerId =
                    tenantBillingCustomerId ??
                    asString((customerByPolar as { id?: unknown }).id);
               if (tenantId) candidates.push({ source: "billing_customer", tenantId });
          }
     }

     const subscriptionMetadata = asRecord(subscription.metadata);
     const payloadMetadata = asRecord(extractSubscriptionFromPayload(payload).metadata);
     const checkoutId =
          asString(subscription.checkout_id) ??
          asString(subscription.polar_checkout_id) ??
          asString(subscriptionMetadata.checkout_id) ??
          asString(payloadMetadata.checkout_id);

     if (checkoutId) {
          const { data: checkoutByPolar } = await adminClient
               .from("billing_checkout_sessions" as never)
               .select("tenant_id, billing_plan_id, billing_plan_price_id")
               .eq("polar_checkout_id" as never, checkoutId)
               .maybeSingle();

          if (checkoutByPolar) {
               const tenantId = asString((checkoutByPolar as { tenant_id?: unknown }).tenant_id);
               if (tenantId) candidates.push({ source: "checkout_correlation", tenantId });
          }
     }

     const trustedExternalId =
          asString(subscription.external_customer_id) ??
          asString(subscription.customer_external_id) ??
          asString(subscriptionMetadata.external_customer_id);

     const externalTenantId = parseTenantIdFromExternalId(trustedExternalId);
     if (externalTenantId) {
          candidates.push({ source: "external_customer_id", tenantId: externalTenantId });
     }

     const metadataTenantId =
          asString(subscriptionMetadata.tenant_id) ?? asString(payloadMetadata.tenant_id);
     if (metadataTenantId) {
          candidates.push({ source: "subscription_metadata", tenantId: metadataTenantId });
     }

     const unique = Array.from(new Set(candidates.map((item) => item.tenantId)));
     if (unique.length === 0) {
          return {
               tenantId: null,
               tenantBillingCustomerId: null,
               conflict: false,
          };
     }

     if (unique.length > 1) {
          return {
               tenantId: null,
               tenantBillingCustomerId: null,
               conflict: true,
               conflictReason: `Tenant resolution conflict: ${unique.join(", ")}`,
          };
     }

     const tenantId = unique[0]!;

     if (!tenantBillingCustomerId && polarCustomerId) {
          const { data: customerByTenant } = await adminClient
               .from("tenant_billing_customers" as never)
               .select("id")
               .eq("tenant_id" as never, tenantId)
               .eq("polar_customer_id" as never, polarCustomerId)
               .maybeSingle();

          tenantBillingCustomerId = asString((customerByTenant as { id?: unknown } | null)?.id);
     }

     return {
          tenantId,
          tenantBillingCustomerId,
          conflict: false,
     };
}

async function resolvePlanAndPrice(params: {
     adminClient: ReturnType<typeof createAdminClient>;
     polarProductId: string | null;
     polarPriceId: string | null;
}): Promise<{
     billingPlanId: string | null;
     billingPlanPriceId: string | null;
}> {
     const { adminClient, polarProductId, polarPriceId } = params;

     let billingPlanId: string | null = null;
     let billingPlanPriceId: string | null = null;

     if (polarProductId) {
          const { data: plan } = await adminClient
               .from("billing_plans" as never)
               .select("id")
               .eq("polar_product_id" as never, polarProductId)
               .maybeSingle();

          billingPlanId = asString((plan as { id?: unknown } | null)?.id);
     }

     if (polarPriceId) {
          const { data: price } = await adminClient
               .from("billing_plan_prices" as never)
               .select("id, billing_plan_id")
               .eq("polar_price_id" as never, polarPriceId)
               .maybeSingle();

          if (price) {
               billingPlanPriceId = asString((price as { id?: unknown }).id);
               if (!billingPlanId) {
                    billingPlanId = asString((price as { billing_plan_id?: unknown }).billing_plan_id);
               }
          }
     }

     return { billingPlanId, billingPlanPriceId };
}

export async function syncPolarSubscription(input: SyncInput): Promise<PolarSubscriptionSyncResult> {
     const adminClient = createAdminClient();

     try {
          const subscription = await getCanonicalSubscription(input);
          const subscriptionId = asString(subscription.id) ?? input.polarSubscriptionId;
          const polarCustomerId =
               asString(subscription.customer_id) ??
               asString(asRecord(subscription.customer).id);
          const polarProductId =
               asString(subscription.product_id) ??
               asString(asRecord(subscription.product).id);
          const polarPriceId =
               asString(subscription.price_id) ??
               asString(asRecord(subscription.price).id);

          const currentTimestamp = new Date().toISOString();
          const eventAt = toIso(input.eventTimestamp) ?? currentTimestamp;
          const incomingModifiedAt =
               toIso(subscription.modified_at ?? subscription.updated_at) ?? eventAt;

          const existingQuery = await adminClient
               .from("tenant_subscriptions" as never)
               .select("id,status,access_state,polar_modified_at,last_event_at,last_event_id")
               .eq("polar_subscription_id" as never, subscriptionId)
               .maybeSingle();

          const existing = (existingQuery.data as Record<string, unknown> | null) ?? null;

          const existingModifiedAt = toIso(existing?.polar_modified_at);
          const existingEventAt = toIso(existing?.last_event_at);
          const stale =
               (existingModifiedAt && incomingModifiedAt < existingModifiedAt) ||
               (existingEventAt && eventAt < existingEventAt) ||
               (existing?.last_event_id && input.eventId && String(existing.last_event_id) === input.eventId);

          if (stale) {
               return {
                    polarSubscriptionId: subscriptionId,
                    tenantId: asString(existing?.tenant_id) ?? null,
                    localSubscriptionId: asString(existing?.id) ?? null,
                    status: "stale_event",
                    previousPolarStatus: asPolarSubscriptionStatus(existing?.status) ?? null,
                    currentPolarStatus: asPolarSubscriptionStatus(existing?.status) ?? null,
                    previousAccessState: asSubscriptionAccessState(existing?.access_state) ?? null,
                    currentAccessState: asSubscriptionAccessState(existing?.access_state) ?? null,
                    syncStatus: "stale_event",
                    reason: "Incoming subscription event is stale.",
               };
          }

          let fetchedCustomer: UnknownRecord | null = null;
          if (polarCustomerId) {
               try {
                    fetchedCustomer = await getPolarCustomer(polarCustomerId);
               } catch {
                    fetchedCustomer = null;
               }
          }

          const customerExternalId =
               asString(fetchedCustomer?.external_id) ??
               asString(subscription.external_customer_id) ??
               asString(asRecord(subscription.metadata).external_customer_id) ??
               null;

          const tenantContext = await resolveTenantContext({
               adminClient,
               subscription,
               payload: input.payload,
               polarCustomerId,
          });

          if (tenantContext.conflict) {
               return {
                    polarSubscriptionId: subscriptionId,
                    tenantId: null,
                    localSubscriptionId: asString(existing?.id) ?? null,
                    status: "conflict",
                    previousPolarStatus: asPolarSubscriptionStatus(existing?.status) ?? null,
                    currentPolarStatus: asPolarSubscriptionStatus(existing?.status) ?? null,
                    previousAccessState: asSubscriptionAccessState(existing?.access_state) ?? null,
                    currentAccessState: asSubscriptionAccessState(existing?.access_state) ?? null,
                    syncStatus: "conflict",
                    reason: tenantContext.conflictReason ?? "Tenant resolution conflict",
               };
          }

          if (!tenantContext.tenantId || !tenantContext.tenantBillingCustomerId || !polarCustomerId) {
               return {
                    polarSubscriptionId: subscriptionId,
                    tenantId: tenantContext.tenantId,
                    localSubscriptionId: asString(existing?.id) ?? null,
                    status: "unresolved_customer",
                    previousPolarStatus: asPolarSubscriptionStatus(existing?.status) ?? null,
                    currentPolarStatus: null,
                    previousAccessState: asSubscriptionAccessState(existing?.access_state) ?? null,
                    currentAccessState: null,
                    syncStatus: "unresolved_customer",
                    reason: "Unable to resolve tenant billing customer for subscription.",
               };
          }

          const planResolution = await resolvePlanAndPrice({
               adminClient,
               polarProductId,
               polarPriceId,
          });

          const accessResolution = resolveSubscriptionAccessState({
               polarStatus: asString(subscription.status),
               cancelAtPeriodEnd: asBoolean(subscription.cancel_at_period_end),
               currentPeriodEnd: asString(subscription.current_period_ends_at),
               trialStart: asString(subscription.trial_start),
               trialEnd: asString(subscription.trial_ends_at),
               endsAt: asString(subscription.ends_at),
               endedAt: asString(subscription.ended_at),
               nowIso: currentTimestamp,
          });

          const syncStatus = normalizeSyncStatus({
               hasCustomer: true,
               hasPlan: Boolean(planResolution.billingPlanId),
               hasPrice: Boolean(planResolution.billingPlanPriceId),
               hasPriceId: Boolean(polarPriceId),
               conflict: false,
               stale: false,
          });

          const subscriptionMetadata = asRecord(subscription.metadata);
          const rawStatus = asString(subscription.status);

          const localPayload = {
               tenant_id: tenantContext.tenantId,
               tenant_billing_customer_id: tenantContext.tenantBillingCustomerId,
               billing_plan_id: planResolution.billingPlanId,
               billing_plan_price_id: planResolution.billingPlanPriceId,
               polar_subscription_id: subscriptionId,
               polar_customer_id: polarCustomerId,
               polar_product_id: polarProductId,
               polar_price_id: polarPriceId,
               polar_checkout_id:
                    asString(subscription.checkout_id) ??
                    asString(subscription.polar_checkout_id) ??
                    null,
               status: accessResolution.normalizedPolarStatus,
               access_state: accessResolution.accessState,
               billing_interval:
                    asString(subscription.billing_interval) ??
                    asString(asRecord(subscription.recurring).interval),
               billing_interval_count:
                    asNumber(subscription.billing_interval_count) ??
                    asNumber(asRecord(subscription.recurring).interval_count),
               amount:
                    asNumber(subscription.amount) ??
                    asNumber(subscription.unit_amount) ??
                    asNumber(asRecord(subscription.price).amount) ??
                    asNumber(asRecord(subscription.price).unit_amount),
               currency:
                    asString(subscription.currency)?.toUpperCase() ??
                    asString(asRecord(subscription.price).currency)?.toUpperCase() ??
                    null,
               quantity: asNumber(subscription.quantity),
               current_period_start: toIso(subscription.current_period_start),
               current_period_ends_at: toIso(subscription.current_period_ends_at),
               trial_start: toIso(subscription.trial_start),
               trial_ends_at: toIso(subscription.trial_ends_at),
               started_at: toIso(subscription.started_at),
               cancel_at_period_end: asBoolean(subscription.cancel_at_period_end),
               canceled_at: toIso(subscription.canceled_at),
               ends_at: toIso(subscription.ends_at),
               ended_at: toIso(subscription.ended_at),
               customer_cancellation_reason:
                    asString(subscription.customer_cancellation_reason) ??
                    asString(asRecord(subscription.cancellation_details).reason),
               customer_cancellation_comment:
                    asString(subscription.customer_cancellation_comment) ??
                    asString(asRecord(subscription.cancellation_details).comment),
               polar_created_at: toIso(subscription.created_at),
               polar_modified_at: incomingModifiedAt,
               last_event_at: eventAt,
               last_event_id: input.eventId ?? null,
               last_synced_at: currentTimestamp,
               sync_status: syncStatus,
               sync_error_code:
                    syncStatus === "synced" ? null : syncStatus === "requires_mapping" ? "requires_mapping" : null,
               sync_error_message:
                    syncStatus === "requires_mapping"
                         ? !planResolution.billingPlanId
                              ? "Polar product is not mapped to a billing plan."
                              : "Polar price is not mapped to a local billing price."
                         : null,
               subscription_metadata: {
                    ...subscriptionMetadata,
                    raw_status: rawStatus,
                    access_reason: accessResolution.reason,
                    unknown_status: accessResolution.isUnknownStatus,
                    customer_external_id: customerExternalId,
               },
          };

          const { data: upserted, error: upsertError } = await adminClient
               .from("tenant_subscriptions" as never)
               .upsert(localPayload as never, { onConflict: "polar_subscription_id" })
               .select("id,status,access_state")
               .single();

          if (upsertError || !upserted) {
               throw new Error(`[subscription-sync] Upsert failed: ${upsertError?.message ?? "unknown"}`);
          }

          const localSubscriptionId = asString((upserted as { id?: unknown }).id);
          const currentStatus = asString((upserted as { status?: unknown }).status);
          const currentAccessState = asString((upserted as { access_state?: unknown }).access_state);
          const previousStatus = asString(existing?.status);
          const previousAccessState = asString(existing?.access_state);

          const changed =
               !existing ||
               previousStatus !== currentStatus ||
               previousAccessState !== currentAccessState;

          if (changed && localSubscriptionId) {
               await adminClient
                    .from("billing_subscription_state_history" as never)
                    .insert(
                         {
                              tenant_id: tenantContext.tenantId,
                              tenant_subscription_id: localSubscriptionId,
                              polar_event_id: input.eventId ?? null,
                              previous_status: previousStatus,
                              new_status: currentStatus,
                              previous_access_state: previousAccessState,
                              new_access_state: currentAccessState,
                              effective_at: eventAt,
                              change_source: input.source,
                              change_summary: {
                                   reason: accessResolution.reason,
                                   status : syncStatus,
                              },
                         } as never
                    );
          }

          const resultStatus: PolarSubscriptionSyncResult["status"] =
               !planResolution.billingPlanId
                    ? "unmapped_product"
                    : polarPriceId && !planResolution.billingPlanPriceId
                         ? "unmapped_price"
                         : existing
                              ? changed
                                   ? "updated"
                                   : "unchanged"
                              : "created";

          return {
               polarSubscriptionId: subscriptionId,
               tenantId: tenantContext.tenantId,
               localSubscriptionId,
               status: resultStatus,
               previousPolarStatus: asPolarSubscriptionStatus(previousStatus) ?? null,
               currentPolarStatus: asPolarSubscriptionStatus(currentStatus) ?? null,
               previousAccessState: asSubscriptionAccessState(previousAccessState) ?? null,
               currentAccessState: asSubscriptionAccessState(currentAccessState) ?? null,
               syncStatus,
          };
     } catch (error) {
          return {
               polarSubscriptionId: input.polarSubscriptionId,
               tenantId: null,
               localSubscriptionId: null,
               status: "failed",
               reason: error instanceof Error ? error.message : "Subscription sync failed",
               syncStatus: "failed",
          };
     }
}
