"use server";

/**
 * Automation CRUD & Lifecycle Actions — Milestone 15.8.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import type { AutomationTriggerType, ReEnrollmentPolicy, StepType } from "../types/automation";

type ActionResult =
  | { success: true; automationId?: string }
  | { success: false; message: string };

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createAutomationAction(
  tenantSlug: string,
  input: {
    name: string;
    description?: string;
    triggerType: AutomationTriggerType;
    triggerConfig?: Record<string, unknown>;
    reEnrollmentPolicy?: ReEnrollmentPolicy;
    timezone?: string;
  }
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "automation.create",
    tenantId: tenant.id,
    userId: user.id,
  });

  if (!input.name?.trim()) return { success: false, message: "Automation name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_automations" as never)
    .insert({
      tenant_id: tenant.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      trigger_type: input.triggerType,
      trigger_config: input.triggerConfig ?? {},
      re_enrollment_policy: input.reEnrollmentPolicy ?? "once_per_trigger",
      timezone: input.timezone ?? "UTC",
      status: "draft",
      created_by: user.id,
    } as never)
    .select("id" as never)
    .single();

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to create automation." };
  }

  const automationId = (data as unknown as { id: string })?.id;
  await log.success({ automationId });
  revalidatePath(`/${tenantSlug}/automations`);
  return { success: true, automationId };
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateAutomationAction(
  tenantSlug: string,
  automationId: string,
  input: {
    name?: string;
    description?: string;
    triggerType?: AutomationTriggerType;
    triggerConfig?: Record<string, unknown>;
    reEnrollmentPolicy?: ReEnrollmentPolicy;
    timezone?: string;
  }
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const supabase = await createClient();

  // Only draft automations can be edited
  const { data: existing } = await supabase
    .from("marketing_automations" as never)
    .select("status" as never)
    .eq("id" as never, automationId)
    .eq("tenant_id" as never, tenant.id)
    .single();

  if (!existing) return { success: false, message: "Automation not found." };
  if ((existing as unknown as { status: string }).status !== "draft") {
    return { success: false, message: "Only draft automations can be edited." };
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.triggerType !== undefined) updateData.trigger_type = input.triggerType;
  if (input.triggerConfig !== undefined) updateData.trigger_config = input.triggerConfig;
  if (input.reEnrollmentPolicy !== undefined) updateData.re_enrollment_policy = input.reEnrollmentPolicy;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;

  const { error } = await supabase
    .from("marketing_automations" as never)
    .update(updateData as never)
    .eq("id" as never, automationId)
    .eq("tenant_id" as never, tenant.id);

  if (error) return { success: false, message: "Unable to update automation." };

  revalidatePath(`/${tenantSlug}/automations`);
  revalidatePath(`/${tenantSlug}/automations/${automationId}`);
  return { success: true, automationId };
}

// ─── Activate (Publish) ──────────────────────────────────────────────────────

export async function activateAutomationAction(
  tenantSlug: string,
  automationId: string,
  steps: Array<{ stepType: StepType; config: Record<string, unknown> }>
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "automation.activate",
    tenantId: tenant.id,
    userId: user.id,
  });

  if (steps.length === 0) {
    return { success: false, message: "At least one step is required." };
  }

  // Validate steps have required content
  for (const step of steps) {
    if (step.stepType === "email") {
      const config = step.config as { subject?: string; content?: string };
      if (!config.subject?.trim() || !config.content?.trim()) {
        return { success: false, message: "Email steps require subject and content." };
      }
    }
    if (step.stepType === "delay") {
      const config = step.config as { value?: number; unit?: string };
      if (!config.value || config.value <= 0) {
        return { success: false, message: "Delay steps require a positive duration." };
      }
    }
  }

  const supabase = createServiceRoleClient();

  // Load automation
  const { data: automation } = await supabase
    .from("marketing_automations" as never)
    .select("id, tenant_id, trigger_type, trigger_config, entry_conditions, re_enrollment_policy, timezone, status" as never)
    .eq("id" as never, automationId)
    .eq("tenant_id" as never, tenant.id)
    .single();

  if (!automation) return { success: false, message: "Automation not found." };

  const a = automation as unknown as {
    id: string; tenant_id: string; trigger_type: string; trigger_config: unknown;
    entry_conditions: unknown; re_enrollment_policy: string; timezone: string; status: string;
  };

  if (a.status !== "draft" && a.status !== "paused") {
    return { success: false, message: "Only draft or paused automations can be activated." };
  }

  // Determine next version number
  const { count: versionCount } = await supabase
    .from("marketing_automation_versions" as never)
    .select("id" as never, { count: "exact", head: true })
    .eq("automation_id" as never, automationId);

  const nextVersion = (versionCount ?? 0) + 1;

  // Create version snapshot
  const { data: version, error: versionError } = await supabase
    .from("marketing_automation_versions" as never)
    .insert({
      tenant_id: tenant.id,
      automation_id: automationId,
      version_number: nextVersion,
      trigger_type: a.trigger_type,
      trigger_config: a.trigger_config,
      entry_conditions: a.entry_conditions,
      re_enrollment_policy: a.re_enrollment_policy,
      timezone: a.timezone,
    } as never)
    .select("id" as never)
    .single();

  if (versionError) {
    await log.failure(versionError);
    return { success: false, message: "Unable to create automation version." };
  }

  const versionId = (version as unknown as { id: string }).id;

  // Create steps for this version
  for (let i = 0; i < steps.length; i++) {
    await supabase
      .from("marketing_automation_steps" as never)
      .insert({
        tenant_id: tenant.id,
        automation_id: automationId,
        version_id: versionId,
        position: i,
        step_type: steps[i]!.stepType,
        config: steps[i]!.config,
      } as never);
  }

  // Update automation status
  await supabase
    .from("marketing_automations" as never)
    .update({
      status: "active",
      current_version_id: versionId,
      published_at: new Date().toISOString(),
      paused_at: null,
    } as never)
    .eq("id" as never, automationId);

  await log.success({ automationId, versionId, versionNumber: nextVersion });
  revalidatePath(`/${tenantSlug}/automations`);
  revalidatePath(`/${tenantSlug}/automations/${automationId}`);
  return { success: true, automationId };
}

// ─── Pause ───────────────────────────────────────────────────────────────────

export async function pauseAutomationAction(
  tenantSlug: string,
  automationId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "automation.pause",
    tenantId: tenant.id,
    userId: user.id,
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_automations" as never)
    .update({ status: "paused", paused_at: new Date().toISOString() } as never)
    .eq("id" as never, automationId)
    .eq("tenant_id" as never, tenant.id)
    .eq("status" as never, "active");

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to pause automation." };
  }

  await log.success({ automationId });
  revalidatePath(`/${tenantSlug}/automations`);
  revalidatePath(`/${tenantSlug}/automations/${automationId}`);
  return { success: true };
}

// ─── Resume ──────────────────────────────────────────────────────────────────

export async function resumeAutomationAction(
  tenantSlug: string,
  automationId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "automation.resume",
    tenantId: tenant.id,
    userId: user.id,
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_automations" as never)
    .update({ status: "active", paused_at: null } as never)
    .eq("id" as never, automationId)
    .eq("tenant_id" as never, tenant.id)
    .eq("status" as never, "paused");

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to resume automation." };
  }

  await log.success({ automationId });
  revalidatePath(`/${tenantSlug}/automations`);
  revalidatePath(`/${tenantSlug}/automations/${automationId}`);
  return { success: true };
}

// ─── Archive ─────────────────────────────────────────────────────────────────

export async function archiveAutomationAction(
  tenantSlug: string,
  automationId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "automation.archive",
    tenantId: tenant.id,
    userId: user.id,
  });

  const supabase = await createClient();
  // Can archive from draft or paused
  const { error } = await supabase
    .from("marketing_automations" as never)
    .update({ status: "archived" } as never)
    .eq("id" as never, automationId)
    .eq("tenant_id" as never, tenant.id)
    .in("status" as never, ["draft", "paused"]);

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to archive automation." };
  }

  await log.success({ automationId });
  revalidatePath(`/${tenantSlug}/automations`);
  return { success: true };
}
