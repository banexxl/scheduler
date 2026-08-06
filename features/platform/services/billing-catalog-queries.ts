import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getBillingDiagnosticsConfig } from "./polar-config";
import type { BillingPlanPriceRow, BillingPlanRow } from "../types/billing";

type BillingPlanWithPrices = BillingPlanRow & {
     prices: BillingPlanPriceRow[];
};

export async function listBillingPlansWithPrices(): Promise<BillingPlanWithPrices[]> {
     const adminClient = createAdminClient();

     const { data: planRows, error: planError } = await adminClient
          .from("billing_plans" as never)
          .select("*")
          .order("sort_order" as never, { ascending: true });

     if (planError) {
          throw new Error(`[billing-catalog] Failed to load plans: ${planError.message}`);
     }

     const plans = (planRows as BillingPlanRow[] | null) ?? [];
     if (plans.length === 0) return [];

     const planIds = plans.map((plan) => plan.id);
     const { data: priceRows, error: priceError } = await adminClient
          .from("billing_plan_prices" as never)
          .select("*")
          .in("billing_plan_id" as never, planIds as never)
          .order("amount" as never, { ascending: true });

     if (priceError) {
          throw new Error(`[billing-catalog] Failed to load prices: ${priceError.message}`);
     }

     const prices = (priceRows as BillingPlanPriceRow[] | null) ?? [];
     const grouped = new Map<string, BillingPlanPriceRow[]>();

     for (const price of prices) {
          const list = grouped.get(price.billing_plan_id) ?? [];
          list.push(price);
          grouped.set(price.billing_plan_id, list);
     }

     return plans.map((plan) => ({
          ...plan,
          prices: grouped.get(plan.id) ?? [],
     }));
}

export async function listRecentBillingWebhookEvents(limit = 25) {
     const adminClient = createAdminClient();
     const safeLimit = Math.min(Math.max(1, limit), 100);

     const { data, error } = await adminClient
          .from("billing_webhook_events" as never)
          .select(
               "id, polar_event_id, event_type, status, attempt_count, created_at, processed_at, ignored_at, last_error_code"
          )
          .order("created_at" as never, { ascending: false })
          .limit(safeLimit);

     if (error) {
          throw new Error(`[billing-catalog] Failed to load webhook events: ${error.message}`);
     }

     return (data as Array<Record<string, unknown>> | null) ?? [];
}

export async function listRecentBillingSyncRuns(limit = 10) {
     const adminClient = createAdminClient();
     const safeLimit = Math.min(Math.max(1, limit), 50);

     const { data, error } = await adminClient
          .from("billing_sync_runs" as never)
          .select("*")
          .order("started_at" as never, { ascending: false })
          .limit(safeLimit);

     if (error) {
          throw new Error(`[billing-catalog] Failed to load sync runs: ${error.message}`);
     }

     return (data as Array<Record<string, unknown>> | null) ?? [];
}

export function getBillingDiagnosticsSummary() {
     return getBillingDiagnosticsConfig();
}
