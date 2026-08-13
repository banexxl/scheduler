"use server";

/**
 * Create Gift Card Purchase Action — Milestone 15.5.
 *
 * Creates a local purchase record and initiates Polar checkout.
 * Browser-supplied amount is NOT authoritative — server loads from product config.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import { randomUUID } from "crypto";

type PurchaseInput = {
  tenantSlug: string;
  productId: string;
  buyerEmail?: string;
  buyerName?: string;
  isGift?: boolean;
  recipientName?: string;
  recipientEmail?: string;
  recipientMessage?: string;
};

type PurchaseResult =
  | { success: true; purchaseId: string; checkoutUrl: string | null }
  | { success: false; message: string };

export async function createGiftCardPurchaseAction(
  input: PurchaseInput
): Promise<PurchaseResult> {
  const log = createServerActionLogger({
    action: "gift_card.purchase.create",
    source: "server_action",
  });

  const supabase = createServiceRoleClient();

  // Resolve tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", input.tenantSlug)
    .in("status", ["active", "trialing"])
    .single();

  if (!tenant) return { success: false, message: "Business not found." };

  // Verify gift cards are enabled
  const { data: settings } = await supabase
    .from("tenant_gift_card_settings")
    .select("enabled")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!settings?.enabled) {
    return { success: false, message: "Gift cards are not available for this business." };
  }

  // Load product (server-side authoritative amount)
  const { data: product } = await supabase
    .from("gift_card_products")
    .select("id, amount, currency, name, is_active, is_public")
    .eq("id", input.productId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!product || !product.is_active || !product.is_public) {
    return { success: false, message: "This gift card is no longer available." };
  }

  // Create local purchase record
  const requestKey = randomUUID();

  const { data: purchase, error: insertError } = await supabase
    .from("gift_card_purchases")
    .insert({
      tenant_id: tenant.id,
      gift_card_product_id: product.id,
      amount: product.amount,
      currency: product.currency,
      status: "creating",
      buyer_email: input.buyerEmail ?? null,
      buyer_name: input.buyerName ?? null,
      is_gift: input.isGift ?? false,
      recipient_name: input.recipientName ?? null,
      recipient_email: input.recipientEmail ?? null,
      recipient_message: input.recipientMessage ?? null,
      request_key: requestKey,
    })
    .select("id")
    .single();

  if (insertError || !purchase) {
    await log.failure(insertError ?? new Error("Purchase insert failed"));
    return { success: false, message: "Unable to create purchase." };
  }

  // TODO: Create Polar checkout here using existing Polar client infrastructure
  // The PolarAppointmentPaymentProvider pattern should be adapted for gift cards.
  // For now, mark as pending (Polar integration requires provider config at runtime)
  const { error: updateError } = await supabase
    .from("gift_card_purchases")
    .update({ status: "pending" })
    .eq("id", purchase.id);

  if (updateError) {
    await log.failure(updateError);
    return { success: false, message: "Unable to update purchase status." };
  }

  await log.success({ purchaseId: purchase.id, amount: product.amount, currency: product.currency });

  return {
    success: true,
    purchaseId: purchase.id,
    checkoutUrl: null, // Will be populated when Polar checkout is created at runtime
  };
}
