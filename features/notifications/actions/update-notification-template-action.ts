"use server";

/**
 * Server actions for notification template management — Milestone 6.12.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { notificationTemplateSchema } from "../schemas/notification-schemas";
import {
  upsertNotificationTemplate,
  deleteNotificationTemplate,
} from "../services/notification-template-service";
import { validateTemplateFields } from "../services/template-renderer";
import type { NotificationTemplateType } from "../types/notification";

type Result = { success: true } | { success: false; error: string };

/**
 * Save (upsert) a notification template.
 */
export async function updateNotificationTemplateAction(
  tenantSlug: string,
  templateType: NotificationTemplateType,
  input: {
    subjectTemplate: string;
    bodyTemplate: string;
  }
): Promise<Result> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const validated = await notificationTemplateSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });

    // Validate template variables
    const validation = validateTemplateFields(
      validated.subjectTemplate,
      validated.bodyTemplate
    );
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(", ") };
    }

    const result = await upsertNotificationTemplate({
      tenantId: tenant.id,
      templateType,
      subjectTemplate: validated.subjectTemplate,
      bodyTemplate: validated.bodyTemplate,
    });

    if (!result.success) {
      return { success: false, error: result.error ?? "Failed to save template." };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      const validationError = error as { errors?: string[] };
      return {
        success: false,
        error: validationError.errors?.join(", ") ?? "Validation failed",
      };
    }
    console.error("[update-notification-template] Error:", { tenantSlug, templateType });
    return { success: false, error: "Failed to save template." };
  }
}

/**
 * Reset a notification template to default (deletes the custom template).
 */
export async function resetNotificationTemplateAction(
  tenantSlug: string,
  templateType: NotificationTemplateType
): Promise<Result> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const result = await deleteNotificationTemplate(tenant.id, templateType);

    if (!result.success) {
      return { success: false, error: result.error ?? "Failed to reset template." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to reset template." };
  }
}
