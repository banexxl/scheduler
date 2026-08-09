import "server-only";

/**
 * Tenant Discount Validation — Milestone 11.7.
 *
 * Validates a coupon code against tenant rules before checkout.
 * Never trusts client-supplied provider_discount_id.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getProviderDiscountId } from "./provider-resource-sync";
import type { ValidateDiscountResult } from "../types/tenant-discount";

export type ValidateDiscountInput = {
  tenantId: string;
  code: string;
  targetType: "appointment" | "package";
  targetId: string; // service_id or package_id
  originalAmount: number;
  currency: string;
};

/**
 * Validates a discount code for a tenant checkout.
 *
 * Checks: active, synced, valid dates, target eligibility, max redemptions.
 * Returns provider_discount_id only if all checks pass.
 * Customer never sees/submits provider IDs.
 */
export async function validateTenantDiscount(
  input: ValidateDiscountInput
): Promise<ValidateDiscountResult> {
  const supabase = createAdminClient();
  const normalizedCode = input.code.trim().toUpperCase();

  // 1. Find active discount by code + tenant
  const { data: discountRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_discounts" as never)
    .select("id, discount_type, percentage, fixed_amount, currency, starts_at, ends_at, maximum_redemptions, is_active" as never)
    .eq("tenant_id" as never, input.tenantId)
    .eq("is_active" as never, true)
    .ilike("code" as never, normalizedCode)
    .single();

  if (!discountRow) {
    return { valid: false, error: "Invalid coupon code." };
  }

  const discount = discountRow as unknown as {
    id: string; discount_type: string; percentage: number | null;
    fixed_amount: number | null; currency: string | null;
    starts_at: string | null; ends_at: string | null;
    maximum_redemptions: number | null; is_active: boolean;
  };

  // 2. Check validity dates
  const now = new Date();
  if (discount.starts_at && new Date(discount.starts_at) > now) {
    return { valid: false, error: "This coupon is not yet active." };
  }
  if (discount.ends_at && new Date(discount.ends_at) <= now) {
    return { valid: false, error: "This coupon has expired." };
  }

  // 3. Check target eligibility
  const targetDbType = input.targetType === "appointment" ? "service" : "package";
  const { data: targets } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_discount_targets" as never)
    .select("target_type, target_id" as never)
    .eq("discount_id" as never, discount.id);

  const targetList = (targets ?? []) as unknown as Array<{ target_type: string; target_id: string | null }>;

  if (targetList.length > 0) {
    const isEligible = targetList.some((t) => {
      if (t.target_type === "all_appointments" && input.targetType === "appointment") return true;
      if (t.target_type === "all_packages" && input.targetType === "package") return true;
      if (t.target_type === targetDbType && t.target_id === input.targetId) return true;
      return false;
    });
    if (!isEligible) {
      return { valid: false, error: "This coupon does not apply to this service." };
    }
  }

  // 4. Check max redemptions
  if (discount.maximum_redemptions) {
    const { count } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_discount_redemptions" as never)
      .select("id" as never, { count: "exact", head: true })
      .eq("discount_id" as never, discount.id)
      .in("status" as never, ["reserved", "confirmed"] as never);

    if ((count ?? 0) >= discount.maximum_redemptions) {
      return { valid: false, error: "This coupon has reached its usage limit." };
    }
  }

  // 5. Check provider sync
  const providerDiscountId = await getProviderDiscountId(input.tenantId, discount.id);
  if (!providerDiscountId) {
    return { valid: false, error: "This coupon is not ready for use yet." };
  }

  // 6. Calculate discount amount
  let discountAmount = 0;
  if (discount.discount_type === "percentage" && discount.percentage) {
    discountAmount = Math.round(input.originalAmount * discount.percentage / 100);
  } else if (discount.discount_type === "fixed" && discount.fixed_amount) {
    if (discount.currency && discount.currency !== input.currency) {
      return { valid: false, error: "This coupon is not available for this currency." };
    }
    discountAmount = Math.min(discount.fixed_amount, input.originalAmount);
  }

  const finalAmount = Math.max(0, input.originalAmount - discountAmount);

  // Reject 100% discounts (no zero-amount checkout in this version)
  if (finalAmount <= 0) {
    return { valid: false, error: "This coupon cannot reduce the total to zero." };
  }

  return {
    valid: true,
    discountId: discount.id,
    providerDiscountId,
    discountAmount,
    finalAmount,
  };
}
