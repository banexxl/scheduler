import "server-only";

/**
 * Scheduled Trigger Discovery — Milestone 15.8.
 *
 * Finds customers eligible for scheduled-type automation triggers:
 * - customer_inactive: last completed appointment > N days AND no upcoming
 * - package_expiring: customer_packages.expires_at within N days
 *
 * Called by the daily cron endpoint (max once per day).
 * Uses bounded database queries with idempotent enrollment.
 *
 * Does NOT scan every customer — uses indexed queries.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { enrollCustomerForTrigger } from "./enrollment-service";
import { logger } from "@/lib/logging";

// ─── Discover Customer Inactive ──────────────────────────────────────────────

/**
 * Finds customers who match the "inactive" criteria for each active
 * customer_inactive automation. Enrolls them with idempotency.
 *
 * Cycle key: Uses a date-based cycle (e.g., "2026-08-W32") so the same
 * customer isn't re-enrolled daily while still inactive.
 * A new enrollment becomes possible after they complete a new appointment.
 */
export async function discoverInactiveCustomers(): Promise<number> {
  const supabase = createServiceRoleClient();

  // Find all active customer_inactive automations
  const { data: automations } = await supabase
    .from("marketing_automations" as never)
    .select("id, tenant_id, trigger_config" as never)
    .eq("trigger_type" as never, "customer_inactive")
    .eq("status" as never, "active");

  if (!automations || (automations as unknown[]).length === 0) return 0;

  let totalEnrolled = 0;

  for (const automation of automations as unknown as Array<{
    id: string; tenant_id: string; trigger_config: { days_inactive?: number };
  }>) {
    const daysInactive = automation.trigger_config.days_inactive ?? 60;
    const cutoffDate = new Date(Date.now() - daysInactive * 86_400_000).toISOString();

    // Find inactive customers:
    // Last completed appointment before cutoff AND no upcoming appointments
    // Bounded to 200 per automation per run
    const { data: candidates } = await supabase.rpc("evaluate_segment_customers" as never, {
      p_tenant_id: automation.tenant_id,
      p_where_clause: `COALESCE((SELECT MAX(a.completed_at) FROM appointments a WHERE a.tenant_id = '${automation.tenant_id}' AND a.customer_id = tc.id AND a.status = 'completed'), '1970-01-01'::timestamptz) < '${cutoffDate}'::timestamptz AND NOT EXISTS(SELECT 1 FROM appointments a WHERE a.tenant_id = '${automation.tenant_id}' AND a.customer_id = tc.id AND a.status IN ('confirmed','pending') AND a.starts_at > NOW())`,
      p_limit: 200,
      p_offset: 0,
    } as never);

    if (!candidates) continue;

    const customers = candidates as unknown as Array<{ id: string }>;

    // Use weekly cycle key to prevent daily re-enrollment
    const weekKey = getWeekKey();

    for (const customer of customers) {
      try {
        await enrollCustomerForTrigger({
          tenantId: automation.tenant_id,
          customerId: customer.id,
          triggerType: "customer_inactive",
          triggerReferenceType: "inactive_cycle",
          triggerReferenceId: `${automation.id}:${weekKey}`,
        });
        totalEnrolled++;
      } catch {
        // Individual enrollment failure is non-fatal
      }
    }
  }

  return totalEnrolled;
}

// ─── Discover Package Expiring ───────────────────────────────────────────────

/**
 * Finds customers with packages expiring within N days for each active
 * package_expiring automation. Enrolls with package ID as reference (idempotent).
 */
export async function discoverExpiringPackages(): Promise<number> {
  const supabase = createServiceRoleClient();

  // Find all active package_expiring automations
  const { data: automations } = await supabase
    .from("marketing_automations" as never)
    .select("id, tenant_id, trigger_config" as never)
    .eq("trigger_type" as never, "package_expiring")
    .eq("status" as never, "active");

  if (!automations || (automations as unknown[]).length === 0) return 0;

  let totalEnrolled = 0;

  for (const automation of automations as unknown as Array<{
    id: string; tenant_id: string; trigger_config: { days_before_expiry?: number };
  }>) {
    const daysBefore = automation.trigger_config.days_before_expiry ?? 7;
    const expiryWindowStart = new Date().toISOString();
    const expiryWindowEnd = new Date(Date.now() + daysBefore * 86_400_000).toISOString();

    // Find packages expiring within the window
    const { data: packages } = await supabase
      .from("customer_packages" as never)
      .select("id, customer_id" as never)
      .eq("tenant_id" as never, automation.tenant_id)
      .eq("status" as never, "active")
      .gte("expires_at" as never, expiryWindowStart)
      .lte("expires_at" as never, expiryWindowEnd)
      .limit(200);

    if (!packages) continue;

    const expiring = packages as unknown as Array<{ id: string; customer_id: string }>;

    for (const pkg of expiring) {
      try {
        await enrollCustomerForTrigger({
          tenantId: automation.tenant_id,
          customerId: pkg.customer_id,
          triggerType: "package_expiring",
          triggerReferenceType: "package",
          triggerReferenceId: pkg.id, // Once per package expiry
        });
        totalEnrolled++;
      } catch {
        // Individual enrollment failure is non-fatal
      }
    }
  }

  return totalEnrolled;
}

// ─── Run All Scheduled Discoveries ──────────────────────────────────────────

/**
 * Runs all scheduled trigger discoveries.
 * Called by POST /api/internal/automations/discover (daily cron).
 */
export async function runScheduledTriggerDiscovery(): Promise<{
  inactiveEnrolled: number;
  packageExpiringEnrolled: number;
}> {
  const [inactiveEnrolled, packageExpiringEnrolled] = await Promise.all([
    discoverInactiveCustomers(),
    discoverExpiringPackages(),
  ]);

  logger.info("scheduled_trigger_discovery_completed", {
    inactiveEnrolled,
    packageExpiringEnrolled,
  });

  return { inactiveEnrolled, packageExpiringEnrolled };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
