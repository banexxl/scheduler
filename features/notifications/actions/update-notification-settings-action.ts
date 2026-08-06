"use server";

/**
 * Server action for updating notification settings — Milestone 6.12.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { notificationSettingsSchema } from "../schemas/notification-schemas";
import { upsertNotificationSettings } from "../services/notification-settings-service";

type Result = { success: true } | { success: false; error: string };

export async function updateNotificationSettingsAction(
  tenantSlug: string,
  input: {
    emailNotificationsEnabled: boolean;
    sendBookingConfirmation: boolean;
    sendRescheduleConfirmation: boolean;
    sendCancellationConfirmation: boolean;
    replyToEmail?: string | null;
    senderName?: string | null;
  }
): Promise<Result> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const validated = await notificationSettingsSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await upsertNotificationSettings({
      tenantId: tenant.id,
      emailNotificationsEnabled: validated.emailNotificationsEnabled,
      sendBookingConfirmation: validated.sendBookingConfirmation,
      sendRescheduleConfirmation: validated.sendRescheduleConfirmation,
      sendCancellationConfirmation: validated.sendCancellationConfirmation,
      replyToEmail: validated.replyToEmail ?? null,
      senderName: validated.senderName ?? null,
    });

    if (!result.success) {
      return { success: false, error: result.error ?? "Failed to save settings." };
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
    console.error("[update-notification-settings] Error:", { tenantSlug });
    return { success: false, error: "Failed to save settings." };
  }
}
