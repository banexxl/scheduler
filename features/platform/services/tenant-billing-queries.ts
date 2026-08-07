import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getTenantBillingCustomer(tenantId: string) {
     const adminClient = createAdminClient();

     const { data, error } = await adminClient
          .from("tenant_billing_customers" as never)
          .select("*")
          .eq("tenant_id" as never, tenantId)
          .maybeSingle();

     if (error) {
          throw new Error(`[tenant-billing] Failed to load billing customer: ${error.message}`);
     }

     return (data as Record<string, unknown> | null) ?? null;
}

export async function listRecentTenantCheckoutSessions(
     tenantId: string,
     limit = 15
) {
     const adminClient = createAdminClient();

     const { data, error } = await adminClient
          .from("billing_checkout_sessions" as never)
          .select("*")
          .eq("tenant_id" as never, tenantId)
          .order("created_at" as never, { ascending: false })
          .limit(Math.min(Math.max(limit, 1), 50));

     if (error) {
          throw new Error(`[tenant-billing] Failed to load checkout sessions: ${error.message}`);
     }

     return (data as Array<Record<string, unknown>> | null) ?? [];
}

export async function listCheckoutEligiblePlansForTenant() {
     const adminClient = createAdminClient();

     const { data: plans, error: planError } = await adminClient
          .from("billing_plans" as never)
          .select("id, plan_key, name, description, is_free, is_active, is_public, sort_order")
          .eq("is_active" as never, true)
          .eq("is_public" as never, true)
          .order("sort_order" as never, { ascending: true });

     if (planError) {
          throw new Error(`[tenant-billing] Failed to load plans: ${planError.message}`);
     }

     const paidPlans = ((plans as Array<Record<string, unknown>> | null) ?? []).filter(
          (plan) => !Boolean(plan.is_free)
     );

     if (paidPlans.length === 0) {
          return [];
     }

     const planIds = paidPlans.map((plan) => String(plan.id));

     const { data: prices, error: priceError } = await adminClient
          .from("billing_plan_prices" as never)
          .select(
               "id, billing_plan_id, polar_product_id, polar_price_id, amount, currency, billing_interval, billing_interval_count, price_type, is_recurring, is_active, is_archived, is_checkout_eligible, last_synced_at"
          )
          .in("billing_plan_id" as never, planIds as never)
          .eq("is_active" as never, true)
          .eq("is_archived" as never, false)
          .eq("is_checkout_eligible" as never, true)
          .order("amount" as never, { ascending: true });

     if (priceError) {
          throw new Error(`[tenant-billing] Failed to load prices: ${priceError.message}`);
     }

     const grouped = new Map<string, Array<Record<string, unknown>>>();
     for (const price of (prices as Array<Record<string, unknown>> | null) ?? []) {
          const planId = String(price.billing_plan_id ?? "");
          if (!planId) continue;
          const list = grouped.get(planId) ?? [];
          list.push(price);
          grouped.set(planId, list);
     }

     return paidPlans.map((plan) => ({
          ...plan,
          prices: grouped.get(String(plan.id)) ?? [],
     }));
}

export async function getTenantBillingOverview(tenantId: string) {
     const [billingCustomer, checkoutSessions, currentSubscription] = await Promise.all([
          getTenantBillingCustomer(tenantId),
          listRecentTenantCheckoutSessions(tenantId, 10),
          getCurrentTenantSubscription(tenantId),
     ]);

     return {
          hasBillingCustomer: Boolean(billingCustomer),
          billingCustomer,
          checkoutSessions,
          currentSubscription,
          hasSubscription: Boolean(currentSubscription),
     };
}

export async function getCurrentTenantSubscription(tenantId: string) {
     const adminClient = createAdminClient();

     const { data, error } = await adminClient
          .from("tenant_subscriptions" as never)
          .select(
               "*, billing_plans(name,plan_key), billing_plan_prices(billing_interval,billing_interval_count,amount,currency)"
          )
          .eq("tenant_id" as never, tenantId)
          .order("current_period_ends_at" as never, { ascending: false, nullsFirst: false })
          .order("updated_at" as never, { ascending: false })
          .limit(1)
          .maybeSingle();

     if (error) {
          throw new Error(`[tenant-billing] Failed to load subscription: ${error.message}`);
     }

     return (data as Record<string, unknown> | null) ?? null;
}

export async function listTenantSubscriptionHistory(tenantId: string, limit = 20) {
     const adminClient = createAdminClient();
     const safeLimit = Math.min(Math.max(limit, 1), 100);

     const { data, error } = await adminClient
          .from("billing_subscription_state_history" as never)
          .select("*")
          .eq("tenant_id" as never, tenantId)
          .order("effective_at" as never, { ascending: false })
          .limit(safeLimit);

     if (error) {
          throw new Error(`[tenant-billing] Failed to load subscription history: ${error.message}`);
     }

     return (data as Array<Record<string, unknown>> | null) ?? [];
}

export async function isTenantSubscriptionSyncPending(tenantId: string): Promise<boolean> {
     const current = await getCurrentTenantSubscription(tenantId);
     if (!current) return true;

     const accessState = String(current.access_state ?? "");
     const syncStatus = String(current.status ?? "");
     if (!accessState) return true;
     return syncStatus !== "synced";
}

export async function getSubscriptionByPolarId(
     polarSubscriptionId: string
): Promise<Record<string, unknown> | null> {
     const adminClient = createAdminClient();

     const { data, error } = await adminClient
          .from("tenant_subscriptions" as never)
          .select("*")
          .eq("polar_subscription_id" as never, polarSubscriptionId)
          .maybeSingle();

     if (error) {
          throw new Error(`[tenant-billing] Failed to load subscription by polar id: ${error.message}`);
     }

     return (data as Record<string, unknown> | null) ?? null;
}

export async function getCheckoutSessionForReturn(params: {
     tenantId: string;
     checkoutSessionId?: string | null;
     requestKey?: string | null;
}) {
     const adminClient = createAdminClient();

     if (params.checkoutSessionId) {
          const { data, error } = await adminClient
               .from("billing_checkout_sessions" as never)
               .select("*")
               .eq("tenant_id" as never, params.tenantId)
               .eq("id" as never, params.checkoutSessionId)
               .maybeSingle();

          if (error) {
               throw new Error(`[tenant-billing] Failed to load checkout session: ${error.message}`);
          }

          return (data as Record<string, unknown> | null) ?? null;
     }

     if (params.requestKey) {
          const { data, error } = await adminClient
               .from("billing_checkout_sessions" as never)
               .select("*")
               .eq("tenant_id" as never, params.tenantId)
               .eq("request_key" as never, params.requestKey)
               .maybeSingle();

          if (error) {
               throw new Error(`[tenant-billing] Failed to load checkout session: ${error.message}`);
          }

          return (data as Record<string, unknown> | null) ?? null;
     }

     return null;
}
