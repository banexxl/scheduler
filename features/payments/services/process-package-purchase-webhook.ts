import "server-only";

/**
 * Package Purchase Webhook Processor — Milestone 11.6.
 *
 * Handles order.paid for package purchases. Fulfills customer package
 * only after trusted Polar payment confirmation.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging";

export type PackagePurchaseWebhookResult =
  | { status: "fulfilled"; purchaseId: string; customerPackageId: string }
  | { status: "already_fulfilled"; purchaseId: string }
  | { status: "not_package_event" }
  | { status: "failed"; reason: string };

/**
 * Determines if a webhook event is a package purchase event.
 */
export function isPackagePurchaseEvent(payload: Record<string, unknown>): boolean {
  const data = (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data))
    ? payload.data as Record<string, unknown> : payload;
  const metadata = (data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata))
    ? data.metadata as Record<string, unknown> : {};
  return metadata.domain === "package_purchase" && Boolean(metadata.package_purchase_id);
}

/**
 * Processes order.paid for a package purchase.
 */
export async function processPackagePurchaseOrderPaid(
  payload: Record<string, unknown>,
  providerEventId: string
): Promise<PackagePurchaseWebhookResult> {
  const data = (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data))
    ? payload.data as Record<string, unknown> : payload;
  const metadata = (data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata))
    ? data.metadata as Record<string, unknown> : {};

  const purchaseId = String(metadata.package_purchase_id ?? "");
  if (!purchaseId) return { status: "not_package_event" };

  const providerOrderId = String(data.id ?? data.order_id ?? "");
  const paidAmount = typeof data.amount === "number" ? data.amount : null;
  const paidCurrency = typeof data.currency === "string" ? data.currency.toUpperCase() : null;

  const supabase = createAdminClient();

  // Call fulfillment RPC
  const { data: result } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .rpc("fulfill_package_purchase" as never, {
      p_purchase_id: purchaseId,
      p_provider_order_id: providerOrderId || null,
      p_paid_amount: paidAmount,
      p_paid_currency: paidCurrency,
    } as never);

  const rpcResult = (result as unknown as Record<string, unknown>) ?? {};
  const status = String(rpcResult.status ?? "failed");

  if (status === "fulfilled") {
    const customerPackageId = String(rpcResult.customer_package_id ?? "");
    logger.info("package_purchase_fulfilled", {
      operation: "package_fulfilled",
      tenantId: String(metadata.tenant_id ?? ""),
    });
    return { status: "fulfilled", purchaseId, customerPackageId };
  }

  if (status === "already_fulfilled") {
    return { status: "already_fulfilled", purchaseId };
  }

  logger.warn("package_purchase_fulfillment_rejected", {
    operation: "package_fulfillment",
    errorCategory: status,
  });

  return { status: "failed", reason: `RPC returned: ${status}` };
}
