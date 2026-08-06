import "server-only";

/**
 * Reminder Rule Service — Milestone 6.13.
 *
 * CRUD queries for tenant reminder rules.
 */

import { createClient } from "@/lib/supabase/server";
import type { ReminderRule, ReminderRuleListItem } from "../types/notification";

// ─── Row Mapper ──────────────────────────────────────────────────────────────

function mapRuleRow(row: Record<string, unknown>): ReminderRule {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    offsetMinutes: row.offset_minutes as number,
    channel: (row.channel as string) as ReminderRule["channel"],
    isActive: row.is_active as boolean,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── Get All Rules ───────────────────────────────────────────────────────────

export async function getReminderRules(
  tenantId: string
): Promise<ReminderRule[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tenant_reminder_rules" as never)
    .select("*")
    .eq("tenant_id" as never, tenantId)
    .order("sort_order" as never, { ascending: true });

  if (!data) return [];
  return (data as unknown as Record<string, unknown>[]).map(mapRuleRow);
}

// ─── Get Active Rules ────────────────────────────────────────────────────────

export async function getActiveReminderRules(
  tenantId: string
): Promise<ReminderRule[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tenant_reminder_rules" as never)
    .select("*")
    .eq("tenant_id" as never, tenantId)
    .eq("is_active" as never, true)
    .order("offset_minutes" as never, { ascending: false });

  if (!data) return [];
  return (data as unknown as Record<string, unknown>[]).map(mapRuleRow);
}

// ─── Get Rule by ID ──────────────────────────────────────────────────────────

export async function getReminderRuleById(
  tenantId: string,
  ruleId: string
): Promise<ReminderRule | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tenant_reminder_rules" as never)
    .select("*")
    .eq("tenant_id" as never, tenantId)
    .eq("id" as never, ruleId)
    .single();

  if (!data) return null;
  return mapRuleRow(data as unknown as Record<string, unknown>);
}

// ─── Create Rule ─────────────────────────────────────────────────────────────

export type CreateRuleInput = {
  tenantId: string;
  name: string;
  offsetMinutes: number;
  isActive?: boolean;
};

export async function createReminderRule(
  input: CreateRuleInput
): Promise<{ success: true; rule: ReminderRule } | { success: false; error: string }> {
  const supabase = await createClient();

  // Get next sort order
  const { data: existing } = await supabase
    .from("tenant_reminder_rules" as never)
    .select("sort_order" as never)
    .eq("tenant_id" as never, input.tenantId)
    .order("sort_order" as never, { ascending: false })
    .limit(1);

  const nextSort = existing && (existing as unknown as Record<string, unknown>[]).length > 0
    ? ((existing as unknown as Record<string, unknown>[])[0]!.sort_order as number) + 1
    : 0;

  const { data, error } = await supabase
    .from("tenant_reminder_rules" as never)
    .insert({
      tenant_id: input.tenantId,
      name: input.name,
      offset_minutes: input.offsetMinutes,
      channel: "email",
      is_active: input.isActive ?? true,
      sort_order: nextSort,
    } as never)
    .select("*")
    .single();

  if (error) {
    if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
      return { success: false, error: "A reminder with this timing already exists." };
    }
    console.error("[reminder-rule] Create error:", error.message);
    return { success: false, error: "Failed to create reminder rule." };
  }

  return { success: true, rule: mapRuleRow(data as unknown as Record<string, unknown>) };
}

// ─── Update Rule ─────────────────────────────────────────────────────────────

export type UpdateRuleInput = {
  tenantId: string;
  ruleId: string;
  name?: string;
  offsetMinutes?: number;
  isActive?: boolean;
};

export async function updateReminderRule(
  input: UpdateRuleInput
): Promise<{ success: true; rule: ReminderRule } | { success: false; error: string }> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.offsetMinutes !== undefined) updates.offset_minutes = input.offsetMinutes;
  if (input.isActive !== undefined) updates.is_active = input.isActive;

  if (Object.keys(updates).length === 0) {
    const existing = await getReminderRuleById(input.tenantId, input.ruleId);
    if (!existing) return { success: false, error: "Rule not found." };
    return { success: true, rule: existing };
  }

  const { data, error } = await supabase
    .from("tenant_reminder_rules" as never)
    .update(updates as never)
    .eq("id" as never, input.ruleId)
    .eq("tenant_id" as never, input.tenantId)
    .select("*")
    .single();

  if (error) {
    if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
      return { success: false, error: "A reminder with this timing already exists." };
    }
    console.error("[reminder-rule] Update error:", error.message);
    return { success: false, error: "Failed to update reminder rule." };
  }

  if (!data) return { success: false, error: "Rule not found." };
  return { success: true, rule: mapRuleRow(data as unknown as Record<string, unknown>) };
}

// ─── Delete Rule ─────────────────────────────────────────────────────────────

export async function deleteReminderRule(
  tenantId: string,
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tenant_reminder_rules" as never)
    .delete()
    .eq("id" as never, ruleId)
    .eq("tenant_id" as never, tenantId);

  if (error) {
    if (error.message?.includes("RESTRICT") || error.message?.includes("violates foreign key")) {
      return { success: false, error: "Cannot delete a rule that has reminder history. Deactivate it instead." };
    }
    console.error("[reminder-rule] Delete error:", error.message);
    return { success: false, error: "Failed to delete reminder rule." };
  }

  return { success: true };
}

// ─── Get Rules as List Items ─────────────────────────────────────────────────

export function rulesToListItems(rules: ReminderRule[]): ReminderRuleListItem[] {
  return rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    offsetMinutes: rule.offsetMinutes,
    channel: rule.channel,
    isActive: rule.isActive,
    sortOrder: rule.sortOrder,
  }));
}
