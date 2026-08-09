/**
 * Package Purchase Types — Milestone 11.6.
 */

export const PACKAGE_PURCHASE_STATUSES = [
  "creating", "pending", "paid", "fulfilled",
  "failed", "expired", "refunded", "cancelled", "requires_review",
] as const;
export type PackagePurchaseStatus = typeof PACKAGE_PURCHASE_STATUSES[number];

export type PackagePurchase = {
  id: string;
  tenantId: string;
  packageId: string;
  tenantCustomerId: string;
  status: PackagePurchaseStatus;
  packageNameSnapshot: string;
  creditsSnapshot: number;
  validityDaysSnapshot: number | null;
  amountTotal: number;
  currency: string;
  provider: string | null;
  providerCheckoutId: string | null;
  providerOrderId: string | null;
  checkoutUrl: string | null;
  requestKey: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  customerPackageId: string | null;
  createdAt: string;
};

export type CreatePackagePurchaseInput = {
  tenantId: string;
  tenantSlug: string;
  packageId: string;
  tenantCustomerId: string;
  customerEmail: string | null;
  customerName: string | null;
};

export type CreatePackagePurchaseResult =
  | { success: true; purchaseId: string; checkoutUrl: string }
  | { success: false; error: string; code: string };

export type PackagePurchaseListItem = {
  id: string;
  packageName: string;
  credits: number;
  amount: number;
  currency: string;
  status: PackagePurchaseStatus;
  paidAt: string | null;
  createdAt: string;
};
