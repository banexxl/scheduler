export type TenantBillingCustomer = {
     id: string;
     tenantId: string;
     polarCustomerId: string;
     externalId: string;
     email: string | null;
     name: string | null;
     customerType: string | null;
     isDeleted: boolean;
     customerMetadata: Record<string, unknown>;
     polarCreatedAt: string | null;
     polarModifiedAt: string | null;
     lastEventAt: string | null;
     lastSyncedAt: string;
     createdAt: string;
     updatedAt: string;
};

export type PolarCustomerSyncResult = {
     status: "synced" | "ignored_stale" | "unresolved";
     tenantId: string | null;
     customerId: string | null;
     reason?: string;
};
