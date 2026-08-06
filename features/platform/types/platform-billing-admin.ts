export type PlatformBillingPlanSummary = {
     id: string;
     planKey: string;
     name: string;
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
