import "server-only";

/**
 * Notification Settings Service — Milestone 6.12.
 *
 * Provides queries and mutations for tenant notification settings.
 * Resolves defaults when no settings row exists.
 */

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type ResolvedNotificationSettings,
  type TenantNotificationSettings,
} from "../types/notification";

// ─── Row Mapper ──────────────────────────────────────────────────────────────

function mapSettingsRow(row: Record<string, unknown>): TenantNotificationSettings {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    emailNotificationsEnabled: row.email_notifications_enabled as boolean,
    sendBookingConfirmation: row.send_booking_confirmation as boolean,
    sendRescheduleConfirmation: row.send_reschedule_confirmation as boolean,
    sendCancellationConfirmation: row.send_cancellation_confirmation as boolean,
    replyToEmail: (row.reply_to_email as string) ?? null,
    senderName: (row.sender_name as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── Get Raw Settings ────────────────────────────────────────────────────────

/**
 * Loads the raw notification settings row for a tenant.
 * Returns null when no row exists (tenant hasn't configured settings yet).
 */
export async function getNotificationSettings(
  tenantId: string
): Promise<TenantNotificationSettings | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tenant_notification_settings" as never)
    .select("*")
    .eq("tenant_id" as never, tenantId)
    .single();

  if (!data) return null;
  return mapSettingsRow(data as Record<string, unknown>);
}

// ─── Resolve Settings (with defaults) ────────────────────────────────────────

/**
 * Resolves notification settings for a tenant, applying defaults
 * when no settings row exists. If a tenant name is provided and
 * sender_name is null, falls back to the tenant name.
 */
export async function resolveNotificationSettings(
  tenantId: string,
  tenantName?: string
): Promise<ResolvedNotificationSettings> {
  const settings = await getNotificationSettings(tenantId);

  if (!settings) {
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      senderName: tenantName ?? null,
    };
  }

  return {
    emailNotificationsEnabled: settings.emailNotificationsEnabled,
    sendBookingConfirmation: settings.sendBookingConfirmation,
    sendRescheduleConfirmation: settings.sendRescheduleConfirmation,
    sendCancellationConfirmation: settings.sendCancellationConfirmation,
    replyToEmail: settings.replyToEmail,
    senderName: settings.senderName ?? tenantName ?? null,
  };
}

// ─── Upsert Settings ─────────────────────────────────────────────────────────

export type UpsertSettingsInput = {
  tenantId: string;
  emailNotificationsEnabled: boolean;
  sendBookingConfirmation: boolean;
  sendRescheduleConfirmation: boolean;
  sendCancellationConfirmation: boolean;
  replyToEmail?: string | null;
  senderName?: string | null;
};

/**
 * Creates or updates notification settings for a tenant.
 */
export async function upsertNotificationSettings(
  input: UpsertSettingsInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tenant_notification_settings" as never)
    .upsert(
      {
        tenant_id: input.tenantId,
        email_notifications_enabled: input.emailNotificationsEnabled,
        send_booking_confirmation: input.sendBookingConfirmation,
        send_reschedule_confirmation: input.sendRescheduleConfirmation,
        send_cancellation_confirmation: input.sendCancellationConfirmation,
        reply_to_email: input.replyToEmail ?? null,
        sender_name: input.senderName ?? null,
      } as never,
      { onConflict: "tenant_id" }
    );

  if (error) {
    console.error("[notification-settings] Upsert error:", error.message);
    return { success: false, error: "Failed to save notification settings." };
  }

  return { success: true };
}
