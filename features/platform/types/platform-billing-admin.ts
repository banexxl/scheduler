export type PlatformBillingPlanSummary = {
     id: string;
     planKey: string;
     name: string;
     description: string | null;
     isFree: boolean;
     isActive: boolean;
     isPublic: boolean;
     sortOrder: number;
     polarProductId: string | null;
     activePriceCount: number;
     archivedPriceCount: number;
     lastSyncedAt: string | null;
};

export type DiscoveredPolarPrice = {
     id: string;
     amount: number | null;
     currency: string | null;
     billingInterval: string | null;
     billingIntervalCount: number | null;
     priceType: string;
     isRecurring: boolean;
     isArchived: boolean;
     isCheckoutEligible: boolean;
};

export type DiscoveredPolarProduct = {
     id: string;
     name: string;
     description: string | null;
     metadata: Record<string, unknown>;
     isMapped: boolean;
     mappedPlanId: string | null;
     prices: DiscoveredPolarPrice[];
};

export type PolarProductDiscoveryResult = {
     products: DiscoveredPolarProduct[];
     mappedCount: number;
     unmappedCount: number;
};

export type PlatformSubscriptionListItem = {
     id: string;
     tenantId: string;
     tenantName: string | null;
     tenantSlug: string | null;
     polarSubscriptionId: string;
     polarCustomerId: string;
     polarProductId: string;
     polarPriceId: string | null;
     planName: string | null;
     planKey: string | null;
     status:
     | "incomplete"
     | "incomplete_expired"
     | "trialing"
     | "active"
     | "past_due"
     | "canceled"
     | "unpaid"
     | "unknown";
     accessState:
     | "pending"
     | "trial"
     | "active"
     | "grace_period"
     | "ending"
     | "revoked";
     billingInterval: string | null;
     billingIntervalCount: number | null;
     currentPeriodEnd: string | null;
     cancelAtPeriodEnd: boolean;
     trialEnd: string | null;
     lastSyncedAt: string;
     syncStatus: string;
};
