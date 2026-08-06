import type { BillingOrder } from "./billing-order";
import type { BillingRefund } from "./billing-refund";

export type TenantBillingHistoryItem = {
     id: string;
     orderId: string;
     orderNumber: string | null;
     planName: string | null;
     billingReason: string | null;
     amount: number;
     currency: string;
     paidAt: string | null;
     paymentStatus: string;
     refundStatus: string;
     refundedAmount: number;
     invoiceUrl: string | null;
     receiptUrl: string | null;
     order: BillingOrder;
     refunds: BillingRefund[];
};
