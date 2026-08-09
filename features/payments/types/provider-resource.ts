/**
 * Provider Resource Sync Types — Milestone 11.7.
 */

export const SYNC_STATUSES = ["pending", "syncing", "synced", "failed", "archived"] as const;
export type SyncStatus = typeof SYNC_STATUSES[number];

export const RESOURCE_TYPES = ["product", "discount"] as const;
export type ProviderResourceType = typeof RESOURCE_TYPES[number];

export type ProviderResourceMapping = {
  id: string;
  tenantId: string;
  provider: string;
  resourceType: ProviderResourceType;
  localResourceId: string;
  providerResourceId: string | null;
  syncStatus: SyncStatus;
  syncVersion: number;
  lastSyncedAt: string | null;
  syncErrorCode: string | null;
  syncErrorMessage: string | null;
  createdAt: string;
};

export type SyncResourceResult =
  | { success: true; providerResourceId: string; syncStatus: "synced" }
  | { success: false; error: string; syncStatus: "failed" };
