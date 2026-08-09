/**
 * Tenant Discount Types — Milestone 11.7.
 */

export const DISCOUNT_TYPES = ["percentage", "fixed"] as const;
export type DiscountType = typeof DISCOUNT_TYPES[number];

export const DISCOUNT_TARGET_TYPES = ["all_appointments", "all_packages", "service", "package"] as const;
export type DiscountTargetType = typeof DISCOUNT_TARGET_TYPES[number];

export const REDEMPTION_STATUSES = ["reserved", "confirmed", "released"] as const;
export type RedemptionStatus = typeof REDEMPTION_STATUSES[number];

export type TenantDiscount = {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  discountType: DiscountType;
  percentage: number | null;
  fixedAmount: number | null;
  currency: string | null;
  startsAt: string | null;
  endsAt: string | null;
  maximumRedemptions: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TenantDiscountTarget = {
  id: string;
  discountId: string;
  targetType: DiscountTargetType;
  targetId: string | null;
};

export type CreateDiscountInput = {
  name: string;
  code?: string | null;
  discountType: DiscountType;
  percentage?: number | null;
  fixedAmount?: number | null;
  currency?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maximumRedemptions?: number | null;
  targets: Array<{ targetType: DiscountTargetType; targetId?: string | null }>;
};

export type DiscountListItem = {
  id: string;
  name: string;
  code: string | null;
  discountType: DiscountType;
  percentage: number | null;
  fixedAmount: number | null;
  currency: string | null;
  isActive: boolean;
  syncStatus: string | null;
  redemptionCount: number;
  createdAt: string;
};

export type ValidateDiscountResult =
  | { valid: true; discountId: string; providerDiscountId: string; discountAmount: number; finalAmount: number }
  | { valid: false; error: string };
