import "server-only";

/**
 * Payment Reconciliation Service — Milestone 11.9.
 *
 * Detects and repairs stale/missed payment states by querying
 * Polar for authoritative status. Always starts from local
 * tenant-scoped records — never lists entire Polar org.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger, generateOperationId } from "@/lib/logging";

export type ReconciliationResult = {
  checked: number;
  repaired: number;
  failed: number;
  flagged: number;
};

const STALE_CREATING_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const MAX_BATCH = 50;

/**
 * Reconciles stale payment intents (creating/open too long).
 * Marks stale creating intents as failed.
 * Does NOT call Polar in this simplified version — webhook
 * recovery handles the provider query path.
 */
export async function reconcileStalePaymentIntents(): Promise<ReconciliationResult> {
  const supabase = createAdminClient();
  const threshold = new Date(Date.now() - STALE_CREATING_THRESHOLD_MS).toISOString();

  // Find stale creating intents (no provider checkout ID = crashed before Polar call)
  const { data: staleCreating } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_intents" as never)
    .select("id" as never)
    .eq("status" as never, "creating")
    .lt("created_at" as never, threshold)
    .is("provider_checkout_id" as never, null)
    .limit(MAX_BATCH);

  let repaired = 0;
  let failed = 0;

  if (staleCreating) {
    const ids = (staleCreating as unknown as Array<{ id: string }>).map(r => r.id);
    if (ids.length > 0) {
      const { error } = await (supabase as never as ReturnType<typeof createAdminClient>)
        .from("payment_intents" as never)
        .update({ status: "failed", failure_code: "STALE_CREATING", failure_message: "Timed out during creation" } as never)
        .in("id" as never, ids as never)
        .eq("status" as never, "creating");

      if (!error) repaired = ids.length;
      else failed = ids.length;
    }
  }

  return { checked: repaired + failed, repaired, failed, flagged: 0 };
}

/**
 * Reconciles paid-but-unfulfilled package purchases.
 * Retries fulfillment RPC (idempotent).
 */
export async function reconcileUnfulfilledPackages(): Promise<ReconciliationResult> {
  const supabase = createAdminClient();
  let repaired = 0;
  let failed = 0;
  let flagged = 0;

  const { data: candidates } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("package_purchases" as never)
    .select("id, provider_order_id" as never)
    .eq("status" as never, "paid")
    .is("fulfilled_at" as never, null)
    .limit(MAX_BATCH);

  if (!candidates || (candidates as unknown as unknown[]).length === 0) {
    return { checked: 0, repaired: 0, failed: 0, flagged: 0 };
  }

  for (const row of candidates as unknown as Array<{ id: string; provider_order_id: string | null }>) {
    const { data: result } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .rpc("fulfill_package_purchase" as never, {
        p_purchase_id: row.id,
        p_provider_order_id: row.provider_order_id,
      } as never);

    const rpcResult = (result as unknown as Record<string, unknown>) ?? {};
    const status = String(rpcResult.status ?? "failed");

    if (status === "fulfilled" || status === "already_fulfilled") repaired++;
    else if (status === "amount_mismatch" || status === "currency_mismatch") flagged++;
    else failed++;
  }

  return { checked: (candidates as unknown as unknown[]).length, repaired, failed, flagged };
}

/**
 * Runs all reconciliation domains in sequence.
 */
export async function runFullReconciliation(): Promise<{
  intents: ReconciliationResult;
  packages: ReconciliationResult;
  runId: string;
}> {
  const supabase = createAdminClient();
  const runId = generateOperationId();

  // Create run record
  await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_provider_reconciliation_runs" as never)
    .insert({
      provider: "polar",
      trigger_type: "scheduled",
      status: "running",
      request_id: runId,
    } as never);

  const intents = await reconcileStalePaymentIntents();
  const packages = await reconcileUnfulfilledPackages();

  const totalChecked = intents.checked + packages.checked;
  const totalRepaired = intents.repaired + packages.repaired;
  const totalFailed = intents.failed + packages.failed;
  const totalFlagged = intents.flagged + packages.flagged;

  // Update run record
  await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_provider_reconciliation_runs" as never)
    .update({
      completed_at: new Date().toISOString(),
      records_checked: totalChecked,
      records_repaired: totalRepaired,
      records_failed: totalFailed,
      records_flagged: totalFlagged,
      status: "completed",
    } as never)
    .eq("request_id" as never, runId);

  logger.info("reconciliation_completed", {
    requestId: runId,
    operation: "full_reconciliation",
  });

  return { intents, packages, runId };
}
