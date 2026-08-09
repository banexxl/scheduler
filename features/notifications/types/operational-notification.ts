/**
 * Operational Notification Types — Milestone 12.5.
 */

export const NOTIFICATION_CATEGORIES = [
  "appointments", "customers", "reviews", "waitlist",
  "payments", "communications", "team", "system",
] as const;
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number];

export const NOTIFICATION_SEVERITIES = ["info", "attention", "warning", "critical"] as const;
export type NotificationSeverity = typeof NOTIFICATION_SEVERITIES[number];

export type OperationalNotificationDTO = {
  id: string;
  category: NotificationCategory;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string | null;
  occurredAt: string;
  isRead: boolean;
  isResolved: boolean;
  actionUrl: string | null;
  canResolve: boolean;
};

export type OperationalNotificationPageDTO = {
  items: OperationalNotificationDTO[];
  unreadCount: number;
  unresolvedCount: number;
  hasMore: boolean;
};

export type CreateOperationalNotificationInput = {
  tenantId: string;
  category: NotificationCategory;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  resourceId?: string | null;
  customerId?: string | null;
  actionUrl?: string | null;
  deduplicationKey?: string | null;
  metadata?: Record<string, unknown>;
};
