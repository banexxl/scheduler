import "server-only";

/**
 * Customer Notification Preferences Service — Milestone 9.4.
 *
 * Resolves effective communication preferences by combining
 * tenant settings (what's supported) with customer preferences (what's opted-in).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_CUSTOMER_PREFERENCES,
  type CustomerNotificationPreferenceRow,
  type ResolvedCustomerCommunicationPreferences,
} from "../types/customer-communication";

// ─── Get Raw Preferences ─────────────────────────────────────────────────────

export async function getCustomerNotificationPreferences(
  tenantId: string,
  tenantCustomerId: string
): Promise<CustomerNotificationPreferenceRow> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_notification_preferences" as never)
    .select("appointment_reminders_enabled, review_requests_enabled, waitlist_notifications_enabled" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("tenant_customer_id" as never, tenantCustomerId)
    .single();

  if (!data) return DEFAULT_CUSTOMER_PREFERENCES;

  const row = data as unknown as Record<string, unknown>;
  return {
    appointmentRemindersEnabled: Boolean(row.appointment_reminders_enabled),
    reviewRequestsEnabled: Boolean(row.review_requests_enabled),
    waitlistNotificationsEnabled: Boolean(row.waitlist_notifications_enabled),
  };
}

// ─── Resolve Effective Preferences ───────────────────────────────────────────

/**
 * Combines tenant capabilities with customer preferences.
 * Tenant must support the feature AND customer must have it enabled.
 */
export async function resolveCustomerCommunicationPreferences(
  tenantId: string,
  tenantCustomerId: string
): Promise<ResolvedCustomerCommunicationPreferences> {
  const supabase = createAdminClient();

  // Load tenant notification settings for capability
  const { data: tenantSettings } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_notification_settings" as never)
    .select("email_notifications_enabled, send_booking_confirmation, send_reschedule_confirmation, send_cancellation_confirmation, review_requests_enabled, waitlist_enabled" as never)
    .eq("tenant_id" as never, tenantId)
    .single();

  // Load tenant reminder rules existence
  const { data: reminderRules } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_reminder_rules" as never)
    .select("id" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("is_active" as never, true)
    .limit(1);

  const tenantRemindersSupported = Boolean(
    tenantSettings && (tenantSettings as unknown as { email_notifications_enabled: boolean }).email_notifications_enabled
    && reminderRules && (reminderRules as unknown as unknown[]).length > 0
  );
  const tenantReviewsSupported = Boolean(
    tenantSettings && (tenantSettings as unknown as { review_requests_enabled?: boolean }).review_requests_enabled
  );
  const tenantWaitlistSupported = Boolean(
    tenantSettings && (tenantSettings as unknown as { waitlist_enabled?: boolean }).waitlist_enabled
  );

  // Load customer preferences
  const prefs = await getCustomerNotificationPreferences(tenantId, tenantCustomerId);

  return {
    appointmentReminders: {
      supported: tenantRemindersSupported,
      enabled: tenantRemindersSupported && prefs.appointmentRemindersEnabled,
    },
    reviewRequests: {
      supported: tenantReviewsSupported,
      enabled: tenantReviewsSupported && prefs.reviewRequestsEnabled,
    },
    waitlistNotifications: {
      supported: tenantWaitlistSupported,
      enabled: tenantWaitlistSupported && prefs.waitlistNotificationsEnabled,
    },
  };
}

// ─── Upsert Preferences ──────────────────────────────────────────────────────

export async function upsertCustomerNotificationPreferences(
  tenantId: string,
  tenantCustomerId: string,
  input: Partial<CustomerNotificationPreferenceRow>
): Promise<{ success: boolean }> {
  const supabase = createAdminClient();

  const { error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_notification_preferences" as never)
    .upsert({
      tenant_id: tenantId,
      tenant_customer_id: tenantCustomerId,
      ...(input.appointmentRemindersEnabled !== undefined && { appointment_reminders_enabled: input.appointmentRemindersEnabled }),
      ...(input.reviewRequestsEnabled !== undefined && { review_requests_enabled: input.reviewRequestsEnabled }),
      ...(input.waitlistNotificationsEnabled !== undefined && { waitlist_notifications_enabled: input.waitlistNotificationsEnabled }),
    } as never, { onConflict: "tenant_id,tenant_customer_id" } as never);

  return { success: !error };
}
