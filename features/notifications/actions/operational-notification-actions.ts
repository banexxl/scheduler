"use server";

/**
 * Operational Notification Actions — Milestone 12.5.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { success: true } | { success: false; error: string };

export async function markNotificationReadAction(
  tenantSlug: string,
  notificationId: string
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);
    const supabase = createAdminClient();

    // Verify notification belongs to tenant
    const { data: notif } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_operational_notifications" as never)
      .select("id" as never)
      .eq("id" as never, notificationId)
      .eq("tenant_id" as never, tenant.id)
      .single();

    if (!notif) return { success: false, error: "Notification not found." };

    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_operational_notification_reads" as never)
      .upsert({
        notification_id: notificationId,
        tenant_member_id: membership.id,
      } as never, { onConflict: "notification_id,tenant_member_id" } as never);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to mark as read." };
  }
}

export async function markAllNotificationsReadAction(
  tenantSlug: string
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);
    const supabase = createAdminClient();

    // Get recent unread notification IDs (bounded)
    const { data: notifs } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_operational_notifications" as never)
      .select("id" as never)
      .eq("tenant_id" as never, tenant.id)
      .order("occurred_at" as never, { ascending: false })
      .limit(100);

    if (!notifs || (notifs as unknown[]).length === 0) return { success: true };

    const ids = (notifs as unknown as Array<{ id: string }>).map(n => n.id);
    const rows = ids.map(id => ({
      notification_id: id,
      tenant_member_id: membership.id,
    }));

    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_operational_notification_reads" as never)
      .upsert(rows as never, { onConflict: "notification_id,tenant_member_id" } as never);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to mark all as read." };
  }
}

export async function resolveNotificationAction(
  tenantSlug: string,
  notificationId: string,
  note?: string
): Promise<ActionResult> {
  try {
    const { user, tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin", "manager"].includes(membership.role)) {
      return { success: false, error: "You cannot resolve notifications." };
    }

    const supabase = createAdminClient();

    const { error } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_operational_notifications" as never)
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_note: note?.slice(0, 1000) ?? null,
      } as never)
      .eq("id" as never, notificationId)
      .eq("tenant_id" as never, tenant.id)
      .is("resolved_at" as never, null);

    if (error) return { success: false, error: "Failed to resolve." };
    return { success: true };
  } catch {
    return { success: false, error: "Failed to resolve notification." };
  }
}
