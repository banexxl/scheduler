"use server";

/**
 * Server actions for reminder rule management — Milestone 6.13.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { reminderRuleSchema, validateOffsetMinutes } from "../schemas/reminder-rule-schemas";
import {
  createReminderRule,
  updateReminderRule,
  deleteReminderRule,
} from "../services/reminder-rule-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { toOffsetMinutes } from "../types/notification";
import type { ReminderOffsetUnit } from "../types/notification";

type ActionResult = { success: true } | { success: false; error: string };

// ─── Create Reminder Rule ────────────────────────────────────────────────────

export async function createReminderRuleAction(
  tenantSlug: string,
  input: {
    name: string;
    offsetAmount: number;
    offsetUnit: string;
    isActive?: boolean;
  }
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const validated = await reminderRuleSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });

    // Validate computed offset
    const offsetError = validateOffsetMinutes(validated.offsetAmount, validated.offsetUnit);
    if (offsetError) {
      return { success: false, error: offsetError };
    }

    const offsetMinutes = toOffsetMinutes(
      validated.offsetAmount,
      validated.offsetUnit as ReminderOffsetUnit
    );

    const result = await createReminderRule({
      tenantId: tenant.id,
      name: validated.name,
      offsetMinutes,
      isActive: validated.isActive,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      const validationError = error as { errors?: string[] };
      return { success: false, error: validationError.errors?.join(", ") ?? "Validation failed" };
    }
    console.error("[create-reminder-rule] Error:", { tenantSlug });
    return { success: false, error: "Failed to create reminder rule." };
  }
}

// ─── Update Reminder Rule ────────────────────────────────────────────────────

export async function updateReminderRuleAction(
  tenantSlug: string,
  ruleId: string,
  input: {
    name: string;
    offsetAmount: number;
    offsetUnit: string;
    isActive?: boolean;
  }
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const validated = await reminderRuleSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });

    const offsetError = validateOffsetMinutes(validated.offsetAmount, validated.offsetUnit);
    if (offsetError) {
      return { success: false, error: offsetError };
    }

    const offsetMinutes = toOffsetMinutes(
      validated.offsetAmount,
      validated.offsetUnit as ReminderOffsetUnit
    );

    const result = await updateReminderRule({
      tenantId: tenant.id,
      ruleId,
      name: validated.name,
      offsetMinutes,
      isActive: validated.isActive,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      const validationError = error as { errors?: string[] };
      return { success: false, error: validationError.errors?.join(", ") ?? "Validation failed" };
    }
    console.error("[update-reminder-rule] Error:", { tenantSlug, ruleId });
    return { success: false, error: "Failed to update reminder rule." };
  }
}

// ─── Toggle Reminder Rule ────────────────────────────────────────────────────

export async function toggleReminderRuleAction(
  tenantSlug: string,
  ruleId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const result = await updateReminderRule({
      tenantId: tenant.id,
      ruleId,
      isActive,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // When deactivating, cancel pending reminders for this rule
    if (!isActive) {
      try {
        const adminClient = createAdminClient();
        await adminClient
          .from("appointment_reminders" as never)
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancellation_reason: "rule_deactivated",
          } as never)
          .eq("tenant_id" as never, tenant.id)
          .eq("reminder_rule_id" as never, ruleId)
          .in("status" as never, ["pending", "processing"] as never);
      } catch {
        // Non-critical — reminders will be skipped during claim validation
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to toggle reminder rule." };
  }
}

// ─── Delete Reminder Rule ────────────────────────────────────────────────────

export async function deleteReminderRuleAction(
  tenantSlug: string,
  ruleId: string
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const result = await deleteReminderRule(tenant.id, ruleId);

    if (!result.success) {
      return { success: false, error: result.error ?? "Failed to delete reminder rule." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete reminder rule." };
  }
}
