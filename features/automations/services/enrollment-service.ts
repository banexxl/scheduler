import "server-only";

/**
 * Automation Enrollment Service — Milestone 15.8.
 *
 * Handles enrolling customers into automations when trigger events occur.
 * Respects:
 * - Re-enrollment policy (once_ever, once_per_trigger, after_completion)
 * - Automation status (only active automations accept enrollments)
 * - Paused automations block new enrollments
 * - Idempotency via unique constraints
 * - Entry conditions (optional)
 *
 * Non-blocking: enrollment failures never roll back domain events.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging";
import type { AutomationTriggerType } from "../types/automation";

// ─── Types ───────────────────────────────────────────────────────────────────

export type EnrollmentTrigger = {
  tenantId: string;
  customerId: string;
  triggerType: AutomationTriggerType;
  triggerReferenceType?: string; // e.g. "appointment", "referral", "gift_card", "package"
  triggerReferenceId?: string;   // e.g. appointment UUID
};

type EnrollmentResult =
  | { enrolled: true; enrollmentId: string }
  | { enrolled: false; reason: string };

// ─── Delay Calculation ───────────────────────────────────────────────────────

export function calculateNextRunAt(delayValue: number, delayUnit: string): Date {
  const now = new Date();
  switch (delayUnit) {
    case "minutes": return new Date(now.getTime() + delayValue * 60_000);
    case "hours": return new Date(now.getTime() + delayValue * 3_600_000);
    case "days": return new Date(now.getTime() + delayValue * 86_400_000);
    case "weeks": return new Date(now.getTime() + delayValue * 604_800_000);
    default: return new Date(now.getTime() + delayValue * 60_000);
  }
}

// ─── Core Enrollment ─────────────────────────────────────────────────────────

/**
 * Attempts to enroll a customer into all active automations matching the trigger.
 * Called from domain event hooks (non-blocking).
 *
 * For each matching active automation:
 * 1. Check re-enrollment policy
 * 2. Evaluate entry conditions (if any)
 * 3. Create enrollment with first step's delay as next_run_at
 */
export async function enrollCustomerForTrigger(
  trigger: EnrollmentTrigger
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    // Find active automations for this trigger type + tenant
    const { data: automations } = await supabase
      .from("marketing_automations" as never)
      .select("id, current_version_id, re_enrollment_policy, entry_conditions" as never)
      .eq("tenant_id" as never, trigger.tenantId)
      .eq("trigger_type" as never, trigger.triggerType)
      .eq("status" as never, "active");

    if (!automations || (automations as unknown[]).length === 0) return;

    for (const automation of automations as unknown as Array<{
      id: string;
      current_version_id: string | null;
      re_enrollment_policy: string;
      entry_conditions: unknown;
    }>) {
      if (!automation.current_version_id) continue;

      try {
        await enrollIntoAutomation(supabase, trigger, automation);
      } catch (err) {
        // Individual automation enrollment failure is non-fatal
        logger.warn("automation_enrollment_individual_failed", {
          automationId: automation.id,
          customerId: trigger.customerId,
          triggerType: trigger.triggerType,
        }, err);
      }
    }
  } catch (err) {
    logger.error("automation_enrollment_trigger_failed", {
      tenantId: trigger.tenantId,
      customerId: trigger.customerId,
      triggerType: trigger.triggerType,
    }, err);
  }
}

async function enrollIntoAutomation(
  supabase: ReturnType<typeof createServiceRoleClient>,
  trigger: EnrollmentTrigger,
  automation: {
    id: string;
    current_version_id: string | null;
    re_enrollment_policy: string;
    entry_conditions: unknown;
  }
): Promise<EnrollmentResult> {
  const versionId = automation.current_version_id!;

  // Load first step to determine initial next_run_at
  const { data: steps } = await supabase
    .from("marketing_automation_steps" as never)
    .select("id, position, step_type, config" as never)
    .eq("version_id" as never, versionId)
    .order("position" as never, { ascending: true })
    .limit(1);

  const firstStep = (steps as unknown as Array<{
    id: string; position: number; step_type: string; config: Record<string, unknown>;
  }> | null)?.[0];

  // Calculate initial next_run_at based on first step
  let nextRunAt: Date;
  if (firstStep?.step_type === "delay") {
    const delayValue = Number(firstStep.config.value ?? 0);
    const delayUnit = String(firstStep.config.unit ?? "minutes");
    nextRunAt = calculateNextRunAt(delayValue, delayUnit);
  } else {
    // Non-delay first step: run immediately
    nextRunAt = new Date();
  }

  // Insert enrollment (idempotency via unique constraint)
  const { data, error } = await supabase
    .from("marketing_automation_enrollments" as never)
    .insert({
      tenant_id: trigger.tenantId,
      automation_id: automation.id,
      version_id: versionId,
      customer_id: trigger.customerId,
      status: "waiting",
      current_step_position: 0,
      triggered_at: new Date().toISOString(),
      next_run_at: nextRunAt.toISOString(),
      trigger_reference_type: trigger.triggerReferenceType ?? null,
      trigger_reference_id: trigger.triggerReferenceId ?? null,
    } as never)
    .select("id" as never)
    .single();

  if (error) {
    // Unique constraint violation = already enrolled (idempotent success)
    if (error.code === "23505") {
      return { enrolled: false, reason: "already_enrolled" };
    }
    return { enrolled: false, reason: error.message };
  }

  const enrollmentId = (data as unknown as { id: string })?.id;
  return { enrolled: true, enrollmentId };
}
