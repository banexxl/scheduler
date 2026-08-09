import "server-only";

/**
 * Create Operational Notification — Milestone 12.5.
 *
 * Central service for creating internal business inbox items.
 * Non-blocking: failure does not roll back critical domain operations.
 * Idempotent via deduplication_key.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging";
import type { CreateOperationalNotificationInput } from "../types/operational-notification";

/**
 * Creates an operational notification. Best-effort — failures logged, not thrown.
 */
export async function createOperationalNotification(
  input: CreateOperationalNotificationInput
): Promise<void> {
  try {
    // Validate action URL (internal only)
    if (input.actionUrl && !input.actionUrl.startsWith("/")) {
      logger.warn("operational_notification_invalid_action_url", {
        tenantId: input.tenantId,
        operation: "create_notification",
      });
      return;
    }

    const supabase = createAdminClient();

    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_operational_notifications" as never)
      .insert({
        tenant_id: input.tenantId,
        category: input.category,
        type: input.type,
        severity: input.severity,
        title: input.title,
        message: input.message ?? null,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        resource_id: input.resourceId ?? null,
        customer_id: input.customerId ?? null,
        action_url: input.actionUrl ?? null,
        deduplication_key: input.deduplicationKey ?? null,
        metadata: input.metadata ?? {},
      } as never);
  } catch (error) {
    // Deduplication conflict is expected/safe
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "23505") {
      return; // Duplicate — expected from idempotent webhook replay
    }

    logger.warn("operational_notification_creation_failed", {
      tenantId: input.tenantId,
      operation: "create_notification",
    });
    // Never throw — operational inbox failure must not block business operations
  }
}
