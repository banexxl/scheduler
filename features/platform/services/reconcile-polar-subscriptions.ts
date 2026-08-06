import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
     listPolarCustomerSubscriptions,
     listPolarSubscriptions,
} from "./polar-client";
import { syncPolarSubscription } from "./sync-polar-subscription";

type ReconcileCounters = {
     scanned: number;
     created: number;
     updated: number;
     unchanged: number;
     staleEvent: number;
     unresolvedCustomer: number;
     requiresMapping: number;
     conflict: number;
     failed: number;
};

function createCounters(): ReconcileCounters {
     return {
          scanned: 0,
          created: 0,
          updated: 0,
          unchanged: 0,
          staleEvent: 0,
          unresolvedCustomer: 0,
          requiresMapping: 0,
          conflict: 0,
          failed: 0,
     };
}

function pushCounters(counters: ReconcileCounters, status: string) {
     counters.scanned += 1;
     switch (status) {
          case "created":
               counters.created += 1;
               break;
          case "updated":
               counters.updated += 1;
               break;
          case "unchanged":
               counters.unchanged += 1;
               break;
          case "stale_event":
               counters.staleEvent += 1;
               break;
          case "unresolved_customer":
               counters.unresolvedCustomer += 1;
               break;
          case "unmapped_product":
          case "unmapped_price":
               counters.requiresMapping += 1;
               break;
          case "conflict":
               counters.conflict += 1;
               break;
          default:
               counters.failed += 1;
               break;
     }
}

function extractSubscriptionIds(rows: Array<Record<string, unknown>>): string[] {
     return rows
          .map((row) => (typeof row.id === "string" ? row.id : ""))
          .filter((id) => id.length > 0);
}

export async function reconcileOneSubscription(
     polarSubscriptionId: string,
     source: "reconciliation" | "manual_refresh" = "reconciliation"
) {
     return syncPolarSubscription({
          polarSubscriptionId,
          source,
          eventTimestamp: new Date().toISOString(),
     });
}

export async function reconcileSubscriptionsForPolarCustomer(input: {
     polarCustomerId: string;
     source?: "reconciliation" | "manual_refresh";
     limit?: number;
}): Promise<ReconcileCounters> {
     const source = input.source ?? "reconciliation";
     const limit = Math.min(Math.max(input.limit ?? 100, 1), 200);
     const counters = createCounters();

     const subscriptions = await listPolarCustomerSubscriptions({
          polarCustomerId: input.polarCustomerId,
          limit,
     });

     for (const id of extractSubscriptionIds(subscriptions)) {
          const result = await syncPolarSubscription({
               polarSubscriptionId: id,
               source,
               eventTimestamp: new Date().toISOString(),
          });
          pushCounters(counters, result.status);
     }

     return counters;
}

export async function reconcileActiveLocalSubscriptions(input?: {
     source?: "reconciliation" | "manual_refresh";
     limit?: number;
}): Promise<ReconcileCounters> {
     const source = input?.source ?? "reconciliation";
     const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);
     const counters = createCounters();

     const adminClient = createAdminClient();
     const { data, error } = await adminClient
          .from("tenant_subscriptions" as never)
          .select("polar_subscription_id")
          .in("access_state" as never, ["trial", "active", "grace_period", "ending"] as never)
          .order("last_synced_at" as never, { ascending: true })
          .limit(limit);

     if (error) {
          throw new Error(`[subscription-reconcile] Failed to load local subscriptions: ${error.message}`);
     }

     const ids = ((data as Array<Record<string, unknown>> | null) ?? [])
          .map((row) => (typeof row.polar_subscription_id === "string" ? row.polar_subscription_id : ""))
          .filter(Boolean);

     for (const id of ids) {
          const result = await syncPolarSubscription({
               polarSubscriptionId: id,
               source,
               eventTimestamp: new Date().toISOString(),
          });
          pushCounters(counters, result.status);
     }

     return counters;
}

export async function reconcileSubscriptionBackfill(input?: {
     source?: "reconciliation" | "manual_refresh";
     limit?: number;
}): Promise<ReconcileCounters> {
     const source = input?.source ?? "reconciliation";
     const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);
     const counters = createCounters();

     const subscriptions = await listPolarSubscriptions({ limit });

     for (const id of extractSubscriptionIds(subscriptions)) {
          const result = await syncPolarSubscription({
               polarSubscriptionId: id,
               source,
               eventTimestamp: new Date().toISOString(),
          });
          pushCounters(counters, result.status);
     }

     return counters;
}
