"use server";

/**
 * Retry failed notification action — Milestone 6.12.
 *
 * Resets a failed notification to pending for reprocessing.
 * Only owners/admins may retry. Only failed notifications are eligible.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { success: true } | { success: false; error: string };

export async function retryNotificationAction(
  tenantSlug: string,
  outboxId: string
): Promise<Result> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    if (!outboxId) {
      return { success: false, error: "Notification ID is required." };
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient.rpc("retry_failed_notification" as never, {
      p_outbox_id: outboxId,
      p_tenant_id: tenant.id,
    } as never);

    if (error) {
      console.error("[retry-notification] RPC error:", error.message);
      return { success: false, error: "Failed to retry notification." };
    }

    const result = data as unknown as { status: string; reason?: string } | null;

    if (!result) {
      return { success: false, error: "No response from retry." };
    }

    if (result.status === "error") {
      if (result.reason === "not_found") {
        return { success: false, error: "Notification not found." };
      }
      if (result.reason === "not_failed") {
        return { success: false, error: "Only failed notifications can be retried." };
      }
      return { success: false, error: result.reason ?? "Retry failed." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to retry notification." };
  }
}
