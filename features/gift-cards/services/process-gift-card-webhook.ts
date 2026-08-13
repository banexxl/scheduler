import "server-only";

/**
 * Gift Card Webhook Processor — Milestone 15.5.1.
 *
 * Handles order.paid events for gift card purchases.
 * Uses the fulfill_gift_card_purchase RPC for atomic idempotent issuance.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging";
import { generateGiftCardCode, hashGiftCardCode, getCodePrefix } from "../utils/gift-card-code";

type ProcessResult =
  | { status: "fulfilled" }
  | { status: "already_fulfilled" }
  | { status: "not_gift_card_event" }
  | { status: "error"; message: string };

/**
 * Detects whether a webhook payload is a gift card purchase event.
 * Checks metadata for domain = "gift_card_purchase".
 */
export function isGiftCardPurchaseEvent(payload: Record<string, unknown>): boolean {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return false;

  const metadata = (data.metadata ?? data.custom_fields) as Record<string, unknown> | undefined;
  if (!metadata) return false;

  return metadata.domain === "gift_card_purchase" || typeof metadata.gift_card_purchase_id === "string";
}

/**
 * Processes an order.paid event for a gift card purchase.
 * Validates amount/currency, then calls fulfill_gift_card_purchase RPC.
 */
export async function processGiftCardPurchaseOrderPaid(
  payload: Record<string, unknown>
): Promise<ProcessResult> {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return { status: "not_gift_card_event" };

  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const purchaseId = String(metadata.purchase_id ?? metadata.gift_card_purchase_id ?? "");

  if (!purchaseId) return { status: "not_gift_card_event" };

  const providerOrderId = String(data.id ?? "");
  const providerEventId = String(payload.event_id ?? payload.id ?? "");

  // Extract payment amount from provider
  const paidAmount = Number(data.amount ?? data.total_amount ?? 0);
  const paidCurrency = String(data.currency ?? "").toUpperCase();

  if (!paidAmount || !paidCurrency) {
    return { status: "error", message: "Missing amount or currency in webhook payload." };
  }

  // Generate secure gift card code
  const rawCode = generateGiftCardCode();
  const codeHash = hashGiftCardCode(rawCode);
  const codePrefix = getCodePrefix(rawCode);

  const supabase = createServiceRoleClient();

  // Call fulfillment RPC (atomic + idempotent)
  const { data: result, error } = await supabase.rpc("fulfill_gift_card_purchase", {
    p_purchase_id: purchaseId,
    p_provider_order_id: providerOrderId,
    p_provider_event_id: providerEventId,
    p_paid_amount: paidAmount,
    p_paid_currency: paidCurrency,
    p_code_hash: codeHash,
    p_code_prefix: codePrefix,
  });

  if (error) {
    logger.error("gift_card_fulfill_rpc_error", {
      operation: "gift_card.fulfill",
    }, error);
    return { status: "error", message: error.message };
  }

  const rpcResult = (typeof result === "string" ? JSON.parse(result) : result) as Record<string, unknown>;

  switch (rpcResult?.status) {
    case "fulfilled":
      logger.info("gift_card_fulfilled", {
        operation: "gift_card.fulfill",
      });
      // TODO: Trigger delivery notification with rawCode (minimum boundary)
      // rawCode must NOT be logged or persisted beyond this point
      return { status: "fulfilled" };

    case "already_fulfilled":
      return { status: "already_fulfilled" };

    case "amount_mismatch":
      logger.warn("gift_card_amount_mismatch", {
        operation: "gift_card.fulfill",
      });
      return { status: "error", message: "Amount mismatch — requires review." };

    default:
      return { status: "error", message: `Unexpected RPC status: ${String(rpcResult?.status)}` };
  }
}
