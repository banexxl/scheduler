export type BillingOrder = {
     id: string;
     tenantId: string;
     tenantBillingCustomerId: string;
     tenantSubscriptionId: string | null;
     billingPlanId: string | null;
     billingPlanPriceId: string | null;
     polarOrderId: string;
     polarCustomerId: string;
     polarSubscriptionId: string | null;
     polarProductId: string | null;
     polarPriceId: string | null;
     polarCheckoutId: string | null;
     status: string;
     billingReason: string | null;
     isPaid: boolean;
     subtotalAmount: number;
     discountAmount: number;
     netAmount: number;
     taxAmount: number;
     totalAmount: number;
     refundedAmount: number;
     currency: string;
     orderNumber: string | null;
     invoiceNumber: string | null;
     invoiceUrl: string | null;
     receiptUrl: string | null;
     paidAt: string | null;
     polarCreatedAt: string | null;
     polarModifiedAt: string | null;
     lastEventAt: string | null;
     lastEventId: string | null;
     lastSyncedAt: string;
     syncStatus: string;
     syncErrorCode: string | null;
     syncErrorMessage: string | null;
     orderMetadata: Record<string, unknown>;
     createdAt: string;
     updatedAt: string;
};

export type BillingPaymentDisplayState =
     | "pending"
     | "paid"
     | "partially_refunded"
     | "refunded";
