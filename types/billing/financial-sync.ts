export type PolarOrderSyncResult = {
     polarOrderId: string;
     tenantId: string | null;
     localOrderId: string | null;
     status:
     | "created"
     | "updated"
     | "unchanged"
     | "stale_event"
     | "unresolved_customer"
     | "unresolved_subscription"
     | "mapping_issue"
     | "conflict"
     | "failed";
     becamePaid: boolean;
     refundStateChanged: boolean;
};

export type PolarRefundSyncResult = {
     polarRefundId: string;
     tenantId: string | null;
     localRefundId: string | null;
     status: "created" | "updated" | "unchanged" | "stale_event" | "conflict" | "failed";
};
