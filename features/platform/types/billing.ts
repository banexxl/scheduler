export type BillingSyncSource =
     | "webhook"
     | "manual"
     | "scheduled_reconciliation"
     | "initial_import";

export type BillingSyncRunType =
     | "product_sync"
     | "reconciliation"
     | "initial_import";

export type BillingWebhookStatus =
     | "pending"
     | "processing"
     | "processed"
     | "ignored"
     | "failed";

export type NormalizedPolarPrice = {
     id: string;
     productId: string;
     type: string;
     recurringInterval: string | null;
     recurringIntervalCount: number | null;
     unitAmount: number | null;
     currency: string | null;
     isRecurring: boolean;
     isArchived: boolean;
     metadata: Record<string, unknown>;
     createdAt: string | null;
     modifiedAt: string | null;
};

export type NormalizedPolarProduct = {
     id: string;
     name: string;
     description: string | null;
     isArchived: boolean;
     metadata: Record<string, unknown>;
     createdAt: string | null;
     modifiedAt: string | null;
     prices: NormalizedPolarPrice[];
};

export type BillingPlanRow = {
     id: string;
     plan_key: string;
     name: string;
     description: string | null;
     polar_product_id: string | null;
     polar_product_name: string | null;
     polar_product_description: string | null;
     is_free: boolean;
     is_active: boolean;
     is_public: boolean;
     sort_order: number;
     product_metadata: Record<string, unknown>;
     polar_created_at: string | null;
     polar_modified_at: string | null;
     last_synced_at: string | null;
     created_at: string;
     updated_at: string;
};

export type BillingPlanPriceRow = {
     id: string;
     billing_plan_id: string;
     polar_product_id: string;
     polar_price_id: string;
     price_type: string;
     billing_interval: string | null;
     billing_interval_count: number | null;
     amount: number | null;
     currency: string | null;
     is_recurring: boolean;
     is_checkout_eligible: boolean;
     is_active: boolean;
     is_archived: boolean;
     price_metadata: Record<string, unknown>;
     polar_created_at: string | null;
     polar_modified_at: string | null;
     last_synced_at: string;
     created_at: string;
     updated_at: string;
};

export type BillingWebhookEventRow = {
     id: string;
     polar_event_id: string;
     event_type: string;
     event_timestamp: string;
     organization_id: string | null;
     resource_id: string | null;
     payload: Record<string, unknown>;
     payload_hash: string;
     status: BillingWebhookStatus;
     attempt_count: number;
     next_attempt_at: string;
     processing_started_at: string | null;
     processing_worker_id: string | null;
     processed_at: string | null;
     ignored_at: string | null;
     last_error_code: string | null;
     last_error_message: string | null;
     created_at: string;
     updated_at: string;
};

export type SyncProductResult = {
     status: "synced" | "skipped_stale" | "unmapped";
     productId: string;
     planId: string | null;
     pricesCreated: number;
     pricesUpdated: number;
     pricesArchived: number;
};

export type ProcessWebhookResult = {
     eventId: string;
     status: "processed" | "ignored" | "retrying" | "failed";
     errorCode?: string;
};
