export type BillingCheckoutStatus =
     | "creating"
     | "open"
     | "updated"
     | "expired"
     | "completed"
     | "failed";

export type BillingCheckoutSession = {
     id: string;
     tenantId: string;
     requestedBy: string;
     billingPlanId: string;
     billingPlanPriceId: string;
     polarCheckoutId: string | null;
     polarProductId: string;
     polarPriceId: string;
     externalCustomerId: string;
     status: BillingCheckoutStatus;
     checkoutUrl: string | null;
     successUrl: string;
     returnUrl: string;
     requestKey: string;
     checkoutMetadata: Record<string, unknown>;
     expiresAt: string | null;
     completedAt: string | null;
     polarCreatedAt: string | null;
     polarModifiedAt: string | null;
     createdAt: string;
     updatedAt: string;
};

export type CheckoutCreationInput = {
     tenantId: string;
     tenantSlug: string;
     requestedBy: string;
     billingPlanPriceId: string;
     requestKey: string;
};

export type CheckoutCreationResult = {
     checkoutSessionId: string;
     checkoutUrl: string;
     status: BillingCheckoutStatus;
};

export type PolarCheckoutSyncResult = {
     status: "synced" | "ignored_stale" | "mismatch" | "unresolved";
     checkoutSessionId: string | null;
     polarCheckoutId: string | null;
     reason?: string;
};
