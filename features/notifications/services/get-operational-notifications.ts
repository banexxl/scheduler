import "server-only";

/**
 * Get Operational Notifications — Milestone 12.5.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { OperationalNotificationDTO, OperationalNotificationPageDTO, NotificationCategory } from "../types/operational-notification";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function getOperationalNotifications(
  tenantId: string,
  membershipId: string,
  memberRole: string,
  resourceId: string | null,
  filters: { category?: NotificationCategory | null; unreadOnly?: boolean; unresolvedOnly?: boolean } = {},
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
): Promise<OperationalNotificationPageDTO> {
  const supabase = createAdminClient();
  const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);

  let query = (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_operational_notifications" as never)
    .select("id, category, type, severity, title, message, occurred_at, action_url, resolved_at, resource_id" as never)
    .eq("tenant_id" as never, tenantId)
    .order("occurred_at" as never, { ascending: false });

  // Category filter
  if (filters.category) query = query.eq("category" as never, filters.category);

  // Unresolved filter
  if (filters.unresolvedOnly) query = query.is("resolved_at" as never, null);

  // Staff visibility: only own resource notifications + non-resource notifications
  if (memberRole === "staff" && resourceId) {
    query = query.or(`resource_id.eq.${resourceId},resource_id.is.null` as never);
  }

  const { data: rows } = await query.range(offset, offset + safeLimit);

  if (!rows) return { items: [], unreadCount: 0, unresolvedCount: 0, hasMore: false };

  const notifications = rows as unknown as Array<Record<string, unknown>>;
  const notificationIds = notifications.map(n => n.id as string);

  // Load read state for this member
  const readSet = new Set<string>();
  if (notificationIds.length > 0) {
    const { data: reads } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_operational_notification_reads" as never)
      .select("notification_id" as never)
      .eq("tenant_member_id" as never, membershipId)
      .in("notification_id" as never, notificationIds as never);

    if (reads) {
      for (const r of reads as unknown as Array<{ notification_id: string }>) {
        readSet.add(r.notification_id);
      }
    }
  }

  // Unread filter (post-query since it depends on per-member state)
  let items: OperationalNotificationDTO[] = notifications.map((n): OperationalNotificationDTO => ({
    id: n.id as string,
    category: n.category as OperationalNotificationDTO["category"],
    type: n.type as string,
    severity: n.severity as OperationalNotificationDTO["severity"],
    title: n.title as string,
    message: (n.message as string) ?? null,
    occurredAt: n.occurred_at as string,
    isRead: readSet.has(n.id as string),
    isResolved: n.resolved_at !== null,
    actionUrl: (n.action_url as string) ?? null,
    canResolve: ["owner", "admin", "manager"].includes(memberRole) && n.resolved_at === null,
  }));

  if (filters.unreadOnly) {
    items = items.filter(n => !n.isRead);
  }

  // Counts
  const unreadCount = items.filter(n => !n.isRead).length;
  const unresolvedCount = items.filter(n => !n.isResolved).length;

  return {
    items: items.slice(0, safeLimit),
    unreadCount,
    unresolvedCount,
    hasMore: notifications.length > safeLimit,
  };
}

/**
 * Lightweight unread count for navigation badge.
 */
export async function getOperationalUnreadCount(
  tenantId: string,
  membershipId: string,
  memberRole: string,
  resourceId: string | null
): Promise<number> {
  const supabase = createAdminClient();

  // Count recent notifications (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();

  let query = (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_operational_notifications" as never)
    .select("id" as never, { count: "exact", head: true })
    .eq("tenant_id" as never, tenantId)
    .gte("occurred_at" as never, thirtyDaysAgo);

  if (memberRole === "staff" && resourceId) {
    query = query.or(`resource_id.eq.${resourceId},resource_id.is.null` as never);
  }

  const { count: totalCount } = await query;

  // Count read ones
  const { count: readCount } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_operational_notification_reads" as never)
    .select("notification_id" as never, { count: "exact", head: true })
    .eq("tenant_member_id" as never, membershipId);

  return Math.max(0, (totalCount ?? 0) - (readCount ?? 0));
}
