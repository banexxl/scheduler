import type {
     PolarSubscriptionStatus,
     SubscriptionAccessState,
} from "./subscription-access-state";

export type SubscriptionSyncSource = "webhook" | "reconciliation" | "manual_refresh";

export type PolarSubscriptionSyncResult = {
     polarSubscriptionId: string;
     tenantId: string | null;
     localSubscriptionId: string | null;
     status:
     | "created"
     | "updated"
     | "unchanged"
     | "stale_event"
     | "unresolved_customer"
     | "unmapped_product"
     | "unmapped_price"
     | "conflict"
     | "failed";
     previousPolarStatus?: PolarSubscriptionStatus | null;
     currentPolarStatus?: PolarSubscriptionStatus | null;
     previousAccessState?: SubscriptionAccessState | null;
     currentAccessState?: SubscriptionAccessState | null;
     syncStatus?: "synced" | "requires_mapping" | "unresolved_customer" | "stale_event" | "conflict" | "failed";
     reason?: string;
};
