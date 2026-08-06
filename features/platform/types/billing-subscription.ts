import type {
     PolarSubscriptionStatus,
     SubscriptionAccessState,
} from "./subscription-access-state";

export type TenantSubscription = {
     id: string;
     tenantId: string;
     tenantBillingCustomerId: string;
     billingPlanId: string | null;
     billingPlanPriceId: string | null;
     polarSubscriptionId: string;
     polarCustomerId: string;
     polarProductId: string;
     polarPriceId: string | null;
     polarCheckoutId: string | null;
     status: PolarSubscriptionStatus;
     accessState: SubscriptionAccessState;
     billingInterval: string | null;
     billingIntervalCount: number | null;
     amount: number | null;
     currency: string | null;
     quantity: number | null;
     currentPeriodStart: string | null;
     currentPeriodEnd: string | null;
     trialStart: string | null;
     trialEnd: string | null;
     startedAt: string | null;
     cancelAtPeriodEnd: boolean;
     canceledAt: string | null;
     endsAt: string | null;
     endedAt: string | null;
     customerCancellationReason: string | null;
     customerCancellationComment: string | null;
     polarCreatedAt: string | null;
     polarModifiedAt: string | null;
     lastEventAt: string | null;
     lastEventId: string | null;
     lastSyncedAt: string;
     syncStatus: "synced" | "requires_mapping" | "unresolved_customer" | "stale_event" | "conflict" | "failed";
     syncErrorCode: string | null;
     syncErrorMessage: string | null;
     subscriptionMetadata: Record<string, unknown>;
     createdAt: string;
     updatedAt: string;
};

export type TenantSubscriptionSummary = {
     planName: string | null;
     planKey: string | null;
     status: PolarSubscriptionStatus | null;
     accessState: SubscriptionAccessState | null;
     billingIntervalLabel: string | null;
     amountLabel: string | null;
     currentPeriodStart: string | null;
     currentPeriodEnd: string | null;
     trialStart: string | null;
     trialEnd: string | null;
     cancelAtPeriodEnd: boolean;
     endsAt: string | null;
     endedAt: string | null;
     lastSyncedAt: string | null;
     syncStatus: string | null;
};

export type SubscriptionStateHistoryEntry = {
     id: string;
     tenantId: string;
     tenantSubscriptionId: string;
     polarEventId: string | null;
     previousStatus: string | null;
     newStatus: string;
     previousAccessState: string | null;
     newAccessState: string;
     effectiveAt: string;
     changeSource: "webhook" | "reconciliation" | "manual_refresh";
     changeSummary: Record<string, unknown>;
     createdAt: string;
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
     status: PolarSubscriptionStatus;
     accessState: SubscriptionAccessState;
     billingInterval: string | null;
     billingIntervalCount: number | null;
     currentPeriodEnd: string | null;
     cancelAtPeriodEnd: boolean;
     trialEnd: string | null;
     lastSyncedAt: string;
     syncStatus: string;
};
