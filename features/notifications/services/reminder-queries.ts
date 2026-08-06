import "server-only";

/**
 * Reminder Query Service — Milestone 6.13.
 *
 * Provides tenant-scoped queries for appointment reminder records.
 */

import { createClient } from "@/lib/supabase/server";
import type { AppointmentReminderListItem } from "../types/notification";

/**
 * Loads all reminders for an appointment, joined with rule name/offset.
 */
export async function getRemindersForAppointment(
  tenantId: string,
  appointmentId: string
): Promise<AppointmentReminderListItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("appointment_reminders" as never)
    .select("id, reminder_rule_id, schedule_version, scheduled_for, status, enqueued_at, sent_at, cancelled_at, cancellation_reason" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("appointment_id" as never, appointmentId)
    .order("scheduled_for" as never, { ascending: true });

  if (!data) return [];

  const rows = data as unknown as Record<string, unknown>[];

  // Load rule names for display
  const ruleIds = [...new Set(rows.map((r) => r.reminder_rule_id as string))];
  const { data: rulesData } = await supabase
    .from("tenant_reminder_rules" as never)
    .select("id, name, offset_minutes" as never)
    .eq("tenant_id" as never, tenantId)
    .in("id" as never, ruleIds as never);

  const rulesMap = new Map<string, { name: string; offsetMinutes: number }>();
  if (rulesData) {
    for (const rule of rulesData as unknown as Record<string, unknown>[]) {
      rulesMap.set(rule.id as string, {
        name: rule.name as string,
        offsetMinutes: rule.offset_minutes as number,
      });
    }
  }

  return rows.map((row) => {
    const ruleInfo = rulesMap.get(row.reminder_rule_id as string);
    return {
      id: row.id as string,
      reminderRuleId: row.reminder_rule_id as string,
      ruleName: ruleInfo?.name ?? "Unknown rule",
      offsetMinutes: ruleInfo?.offsetMinutes ?? 0,
      scheduleVersion: row.schedule_version as number,
      scheduledFor: row.scheduled_for as string,
      status: row.status as AppointmentReminderListItem["status"],
      enqueuedAt: (row.enqueued_at as string) ?? null,
      sentAt: (row.sent_at as string) ?? null,
      cancelledAt: (row.cancelled_at as string) ?? null,
      cancellationReason: (row.cancellation_reason as string) ?? null,
    };
  });
}
