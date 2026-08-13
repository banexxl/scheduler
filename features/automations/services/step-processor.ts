import "server-only";

/**
 * Automation Step Processor — Milestone 15.8.
 *
 * Processes due automation enrollments step by step.
 * Called by the internal cron route.
 *
 * Architecture:
 * 1. Claim due enrollments (FOR UPDATE SKIP LOCKED via RPC)
 * 2. For each enrollment: load current step, execute it
 * 3. Advance to next step or complete
 *
 * Step execution:
 * - delay: Already waited (next_run_at passed) → advance
 * - condition: Evaluate current customer state → continue or end
 * - email: Check eligibility → deliver via campaign infrastructure → advance
 *
 * Reuses: marketing eligibility, campaign email renderer, email provider
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { isCustomerMarketingEligible } from "@/features/campaigns/services/marketing-eligibility";
import { getOrCreateUnsubscribeToken } from "@/features/campaigns/services/unsubscribe-token-service";
import { renderCampaignEmail } from "@/features/campaigns/services/campaign-email-renderer";
import { getEmailProvider } from "@/features/notifications/services/providers";
import { resolveNotificationSettings } from "@/features/notifications/services/notification-settings-service";
import { evaluateConditionStep } from "./condition-engine";
import { calculateNextRunAt } from "./enrollment-service";
import { logger } from "@/lib/logging";
import type { StepType } from "../types/automation";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProcessAutomationsResult = {
  processed: number;
  advanced: number;
  completed: number;
  skipped: number;
  failed: number;
};

type ClaimedEnrollment = {
  enrollment_id: string;
  tenant_id: string;
  automation_id: string;
  version_id: string;
  customer_id: string;
  current_step_position: number;
};

type StepRow = {
  id: string;
  position: number;
  step_type: StepType;
  config: Record<string, unknown>;
};

// ─── Process Due Enrollments ─────────────────────────────────────────────────

/**
 * Claims and processes due automation enrollments.
 * Called by POST /api/internal/automations/process
 */
export async function processDueAutomationEnrollments(
  batchSize = 50
): Promise<ProcessAutomationsResult> {
  const supabase = createServiceRoleClient();

  // Claim batch
  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_due_automation_enrollments" as never,
    { p_batch_size: batchSize } as never
  );

  if (claimError || !claimed) {
    if (claimError) {
      logger.error("automation_claim_failed", {}, claimError);
    }
    return { processed: 0, advanced: 0, completed: 0, skipped: 0, failed: 0 };
  }

  const enrollments = claimed as unknown as ClaimedEnrollment[];
  let advanced = 0;
  let completed = 0;
  let skipped = 0;
  let failed = 0;

  for (const enrollment of enrollments) {
    try {
      const result = await processOneEnrollment(supabase, enrollment);
      if (result === "advanced") advanced++;
      else if (result === "completed") completed++;
      else if (result === "skipped") skipped++;
      else if (result === "failed") failed++;
    } catch (err) {
      failed++;
      logger.error("automation_enrollment_process_failed", {
        enrollmentId: enrollment.enrollment_id,
        automationId: enrollment.automation_id,
      }, err);

      // Mark failed
      await supabase.rpc("fail_automation_enrollment" as never, {
        p_enrollment_id: enrollment.enrollment_id,
      } as never);
    }
  }

  return { processed: enrollments.length, advanced, completed, skipped, failed };
}

// ─── Process Single Enrollment ───────────────────────────────────────────────

async function processOneEnrollment(
  supabase: ReturnType<typeof createServiceRoleClient>,
  enrollment: ClaimedEnrollment
): Promise<"advanced" | "completed" | "skipped" | "failed"> {
  // Load steps for this version
  const { data: steps } = await supabase
    .from("marketing_automation_steps" as never)
    .select("id, position, step_type, config" as never)
    .eq("version_id" as never, enrollment.version_id)
    .order("position" as never, { ascending: true });

  const allSteps = (steps as unknown as StepRow[]) ?? [];
  const currentStep = allSteps.find((s) => s.position === enrollment.current_step_position);

  if (!currentStep) {
    // No more steps → complete
    await supabase.rpc("complete_automation_enrollment" as never, {
      p_enrollment_id: enrollment.enrollment_id,
    } as never);
    return "completed";
  }

  // Execute the step
  const stepResult = await executeStep(supabase, enrollment, currentStep);

  if (stepResult === "end") {
    // Condition failed or journey ends
    await supabase.rpc("complete_automation_enrollment" as never, {
      p_enrollment_id: enrollment.enrollment_id,
    } as never);
    return "completed";
  }

  if (stepResult === "skipped") {
    // Email skipped (opt-out) — continue to next step
    await recordStepExecution(supabase, enrollment, currentStep, "skipped", "marketing_opt_out");
  } else if (stepResult === "failed") {
    await recordStepExecution(supabase, enrollment, currentStep, "failed");
    // Continue to next step even on email failure
  } else {
    await recordStepExecution(supabase, enrollment, currentStep, "completed");
  }

  // Advance to next step
  const nextStepIndex = allSteps.findIndex((s) => s.position > enrollment.current_step_position);

  if (nextStepIndex === -1) {
    // No more steps → complete
    await supabase.rpc("complete_automation_enrollment" as never, {
      p_enrollment_id: enrollment.enrollment_id,
    } as never);
    return "completed";
  }

  const nextStep = allSteps[nextStepIndex]!;

  // Calculate next_run_at based on next step type
  let nextRunAt: Date;
  if (nextStep.step_type === "delay") {
    const delayValue = Number(nextStep.config.value ?? 0);
    const delayUnit = String(nextStep.config.unit ?? "minutes");
    nextRunAt = calculateNextRunAt(delayValue, delayUnit);
  } else {
    // Non-delay steps execute immediately on next processor run
    nextRunAt = new Date();
  }

  await supabase.rpc("advance_automation_enrollment" as never, {
    p_enrollment_id: enrollment.enrollment_id,
    p_next_step_position: nextStep.position,
    p_next_run_at: nextRunAt.toISOString(),
  } as never);

  return "advanced";
}

// ─── Execute Individual Steps ────────────────────────────────────────────────

async function executeStep(
  supabase: ReturnType<typeof createServiceRoleClient>,
  enrollment: ClaimedEnrollment,
  step: StepRow
): Promise<"ok" | "end" | "skipped" | "failed"> {
  switch (step.step_type) {
    case "delay":
      // Delay already elapsed (we only process when next_run_at is due)
      return "ok";

    case "condition":
      return await executeConditionStep(enrollment, step);

    case "email":
      return await executeEmailStep(supabase, enrollment, step);

    default:
      return "ok";
  }
}

async function executeConditionStep(
  enrollment: ClaimedEnrollment,
  step: StepRow
): Promise<"ok" | "end"> {
  // Evaluate condition using CURRENT customer state
  const passes = await evaluateConditionStep(
    enrollment.tenant_id,
    enrollment.customer_id,
    step.config
  );

  return passes ? "ok" : "end";
}

async function executeEmailStep(
  supabase: ReturnType<typeof createServiceRoleClient>,
  enrollment: ClaimedEnrollment,
  step: StepRow
): Promise<"ok" | "skipped" | "failed"> {
  // Marketing eligibility check (PART 15 — final suppression)
  const { eligible } = await isCustomerMarketingEligible(
    enrollment.tenant_id,
    enrollment.customer_id,
    "email"
  );

  if (!eligible) {
    return "skipped";
  }

  try {
    // Load tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, slug")
      .eq("id", enrollment.tenant_id)
      .single();

    const tenantName = (tenant as { name: string; slug: string } | null)?.name ?? "Business";
    const tenantSlug = (tenant as { name: string; slug: string } | null)?.slug ?? "";

    // Load customer email
    const { data: customer } = await supabase
      .from("tenant_customers")
      .select("email")
      .eq("id", enrollment.customer_id)
      .eq("tenant_id", enrollment.tenant_id)
      .single();

    const email = (customer as { email: string | null } | null)?.email;
    if (!email) return "skipped";

    // Generate unsubscribe token
    const unsubscribeToken = await getOrCreateUnsubscribeToken(
      enrollment.tenant_id,
      enrollment.customer_id
    );

    // Render email
    const subject = String(step.config.subject ?? "");
    const content = String(step.config.content ?? "");
    const ctaText = step.config.cta_text ? String(step.config.cta_text) : null;
    const ctaUrl = step.config.cta_url ? String(step.config.cta_url) : null;

    const rendered = await renderCampaignEmail({
      tenantId: enrollment.tenant_id,
      tenantName,
      tenantSlug,
      subject,
      content,
      ctaText,
      ctaUrl,
      unsubscribeToken,
      customerName: "",
    });

    // Send via provider (reusing campaign delivery infrastructure)
    const settings = await resolveNotificationSettings(enrollment.tenant_id, tenantName);
    const provider = getEmailProvider();
    const result = await provider.send({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      fromName: settings.senderName ?? tenantName,
      replyTo: settings.replyToEmail ?? undefined,
      idempotencyKey: `automation:${enrollment.enrollment_id}:step:${step.id}`,
    });

    return result.success ? "ok" : "failed";
  } catch (err) {
    logger.error("automation_email_step_failed", {
      enrollmentId: enrollment.enrollment_id,
      stepId: step.id,
    }, err);
    return "failed";
  }
}

// ─── Step Execution Recording ────────────────────────────────────────────────

async function recordStepExecution(
  supabase: ReturnType<typeof createServiceRoleClient>,
  enrollment: ClaimedEnrollment,
  step: StepRow,
  status: string,
  skipReason?: string
) {
  const executionKey = `${enrollment.enrollment_id}:${step.id}`;

  await supabase
    .from("marketing_automation_step_executions" as never)
    .upsert({
      tenant_id: enrollment.tenant_id,
      automation_id: enrollment.automation_id,
      enrollment_id: enrollment.enrollment_id,
      step_id: step.id,
      status,
      execution_key: executionKey,
      started_at: new Date().toISOString(),
      completed_at: status === "completed" ? new Date().toISOString() : null,
      failed_at: status === "failed" ? new Date().toISOString() : null,
      skip_reason: skipReason ?? null,
    } as never, {
      onConflict: "enrollment_id,execution_key",
      ignoreDuplicates: true,
    } as never);
}
