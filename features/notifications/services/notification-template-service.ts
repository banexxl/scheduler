import "server-only";

/**
 * Notification Template Service — Milestone 6.12.
 *
 * Provides queries and mutations for notification templates.
 * Resolves defaults when no custom template exists.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  NotificationTemplate,
  NotificationTemplateType,
} from "../types/notification";
import { getDefaultTemplate } from "./template-renderer";

// ─── Row Mapper ──────────────────────────────────────────────────────────────

function mapTemplateRow(row: Record<string, unknown>): NotificationTemplate {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    templateType: row.template_type as NotificationTemplateType,
    subjectTemplate: row.subject_template as string,
    bodyTemplate: row.body_template as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── Get Template by Type ────────────────────────────────────────────────────

/**
 * Loads a specific notification template for a tenant.
 * Returns null when no custom template exists.
 */
export async function getNotificationTemplate(
  tenantId: string,
  templateType: NotificationTemplateType
): Promise<NotificationTemplate | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("notification_templates" as never)
    .select("*")
    .eq("tenant_id" as never, tenantId)
    .eq("template_type" as never, templateType)
    .single();

  if (!data) return null;
  return mapTemplateRow(data as Record<string, unknown>);
}

// ─── Get All Templates for Tenant ────────────────────────────────────────────

/**
 * Loads all notification templates for a tenant.
 */
export async function getAllNotificationTemplates(
  tenantId: string
): Promise<NotificationTemplate[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("notification_templates" as never)
    .select("*")
    .eq("tenant_id" as never, tenantId)
    .order("template_type");

  if (!data) return [];
  return (data as Record<string, unknown>[]).map(mapTemplateRow);
}

// ─── Resolve Template (with defaults) ────────────────────────────────────────

export type ResolvedTemplate = {
  subject: string;
  body: string;
  isCustom: boolean;
};

/**
 * Resolves the effective template for a given type.
 * Uses custom template if it exists and is active, otherwise falls back to default.
 */
export async function resolveTemplate(
  tenantId: string,
  templateType: NotificationTemplateType
): Promise<ResolvedTemplate> {
  const custom = await getNotificationTemplate(tenantId, templateType);

  if (custom && custom.isActive) {
    return {
      subject: custom.subjectTemplate,
      body: custom.bodyTemplate,
      isCustom: true,
    };
  }

  const defaults = getDefaultTemplate(templateType);
  return {
    subject: defaults.subject,
    body: defaults.body,
    isCustom: false,
  };
}

// ─── Upsert Template ─────────────────────────────────────────────────────────

export type UpsertTemplateInput = {
  tenantId: string;
  templateType: NotificationTemplateType;
  subjectTemplate: string;
  bodyTemplate: string;
  isActive?: boolean;
};

/**
 * Creates or updates a notification template for a tenant.
 */
export async function upsertNotificationTemplate(
  input: UpsertTemplateInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notification_templates" as never)
    .upsert(
      {
        tenant_id: input.tenantId,
        template_type: input.templateType,
        subject_template: input.subjectTemplate,
        body_template: input.bodyTemplate,
        is_active: input.isActive ?? true,
      } as never,
      { onConflict: "tenant_id,template_type" }
    );

  if (error) {
    console.error("[notification-template] Upsert error:", error.message);
    return { success: false, error: "Failed to save template." };
  }

  return { success: true };
}

// ─── Delete Template (reset to default) ──────────────────────────────────────

/**
 * Deletes a custom template, effectively resetting to the default.
 */
export async function deleteNotificationTemplate(
  tenantId: string,
  templateType: NotificationTemplateType
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notification_templates" as never)
    .delete()
    .eq("tenant_id" as never, tenantId)
    .eq("template_type" as never, templateType);

  if (error) {
    console.error("[notification-template] Delete error:", error.message);
    return { success: false, error: "Failed to reset template." };
  }

  return { success: true };
}
