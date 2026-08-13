import "server-only";

/**
 * Processor Health Service — Milestone 15.11.
 *
 * Tracks processor health by querying run history.
 * Determines staleness based on expected cadence.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

// ─── Processor Registry ──────────────────────────────────────────────────────

export type ProcessorDef = {
  name: string;
  label: string;
  expectedCadenceMinutes: number; // Max expected gap between runs
};

export const PROCESSOR_REGISTRY: ProcessorDef[] = [
  { name: "notifications", label: "Notification Delivery", expectedCadenceMinutes: 5 },
  { name: "reminders", label: "Appointment Reminders", expectedCadenceMinutes: 5 },
  { name: "campaigns", label: "Campaign Delivery", expectedCadenceMinutes: 5 },
  { name: "automations_process", label: "Automation Steps", expectedCadenceMinutes: 5 },
  { name: "automations_discover", label: "Automation Discovery", expectedCadenceMinutes: 1440 },
  { name: "imports", label: "Data Import Processing", expectedCadenceMinutes: 5 },
  { name: "reconciliation", label: "Payment Reconciliation", expectedCadenceMinutes: 60 },
  { name: "payment_expiry", label: "Payment Expiry", expectedCadenceMinutes: 10 },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProcessorHealthStatus = "healthy" | "stale" | "failing" | "unknown";

export type ProcessorHealth = {
  name: string;
  label: string;
  status: ProcessorHealthStatus;
  lastSuccessAt: string | null;
  lastFailedAt: string | null;
  lastDurationMs: number | null;
  lastProcessed: number | null;
  lastFailed: number | null;
};

// ─── Health Query ────────────────────────────────────────────────────────────

export async function getProcessorHealthStatus(): Promise<ProcessorHealth[]> {
  const supabase = createServiceRoleClient();
  const results: ProcessorHealth[] = [];

  for (const processor of PROCESSOR_REGISTRY) {
    // Get latest successful run
    const { data: lastSuccess } = await supabase
      .from("platform_processor_runs" as never)
      .select("started_at, duration_ms, processed_count, failed_count" as never)
      .eq("processor_name" as never, processor.name)
      .eq("status" as never, "completed")
      .order("started_at" as never, { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get latest failed run
    const { data: lastFailure } = await supabase
      .from("platform_processor_runs" as never)
      .select("started_at" as never)
      .eq("processor_name" as never, processor.name)
      .eq("status" as never, "failed")
      .order("started_at" as never, { ascending: false })
      .limit(1)
      .maybeSingle();

    const successRow = lastSuccess as unknown as { started_at: string; duration_ms: number | null; processed_count: number; failed_count: number } | null;
    const failureRow = lastFailure as unknown as { started_at: string } | null;

    // Determine status
    let status: ProcessorHealthStatus = "unknown";

    if (successRow) {
      const minutesSinceSuccess = (Date.now() - new Date(successRow.started_at).getTime()) / 60_000;
      if (minutesSinceSuccess <= processor.expectedCadenceMinutes * 2) {
        status = "healthy";
      } else {
        status = "stale";
      }
    }

    if (failureRow && successRow) {
      if (new Date(failureRow.started_at) > new Date(successRow.started_at)) {
        status = "failing";
      }
    } else if (failureRow && !successRow) {
      status = "failing";
    }

    results.push({
      name: processor.name,
      label: processor.label,
      status,
      lastSuccessAt: successRow?.started_at ?? null,
      lastFailedAt: failureRow?.started_at ?? null,
      lastDurationMs: successRow?.duration_ms ?? null,
      lastProcessed: successRow?.processed_count ?? null,
      lastFailed: successRow?.failed_count ?? null,
    });
  }

  return results;
}

// ─── Backlog Queries ─────────────────────────────────────────────────────────

export type BacklogSummary = {
  pendingNotifications: number;
  scheduledCampaignsPastDue: number;
  dueAutomationEnrollments: number;
  pendingImportRows: number;
  failedWebhooks: number;
  stalePaymentIntents: number;
};

export async function getBacklogSummary(): Promise<BacklogSummary> {
  const supabase = createServiceRoleClient();

  const [notifications, campaigns, automations, imports, webhooks, payments] = await Promise.all([
    supabase.from("notification_outbox" as never).select("id" as never, { count: "exact", head: true }).eq("status" as never, "pending"),
    supabase.from("customer_campaigns" as never).select("id" as never, { count: "exact", head: true }).eq("status" as never, "scheduled").lte("scheduled_for" as never, new Date().toISOString()),
    supabase.from("marketing_automation_enrollments" as never).select("id" as never, { count: "exact", head: true }).in("status" as never, ["active", "waiting"]).lte("next_run_at" as never, new Date().toISOString()),
    supabase.from("data_import_rows" as never).select("id" as never, { count: "exact", head: true }).eq("status" as never, "valid"),
    supabase.from("billing_webhook_events" as never).select("id" as never, { count: "exact", head: true }).eq("status" as never, "failed"),
    supabase.from("payment_intents" as never).select("id" as never, { count: "exact", head: true }).eq("status" as never, "creating"),
  ]);

  return {
    pendingNotifications: notifications.count ?? 0,
    scheduledCampaignsPastDue: campaigns.count ?? 0,
    dueAutomationEnrollments: automations.count ?? 0,
    pendingImportRows: imports.count ?? 0,
    failedWebhooks: webhooks.count ?? 0,
    stalePaymentIntents: payments.count ?? 0,
  };
}
