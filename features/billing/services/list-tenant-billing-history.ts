import { createAdminClient } from "@/lib/supabase/admin";
import type { TenantBillingHistoryItem } from "@/types/billing/billing-history";
import type { BillingOrder } from "@/types/billing/billing-order";
import type { BillingRefund } from "@/types/billing/billing-refund";

function toStringValue(value: unknown): string | null {
     return typeof value === "string" ? value : null;
}

function toNumberValue(value: unknown, fallback = 0): number {
     if (typeof value === "number") {
          return value;
     }

     if (typeof value === "string") {
          const parsedValue = Number(value);
          return Number.isFinite(parsedValue) ? parsedValue : fallback;
     }

     return fallback;
}

function toRecord(value: unknown): Record<string, unknown> {
     return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function mapBillingOrder(row: Record<string, unknown>): BillingOrder {
     return {
          id: String(row.id ?? ""),
          tenantId: String(row.tenant_id ?? ""),
          tenantBillingCustomerId: String(row.tenant_billing_customer_id ?? ""),
          tenantSubscriptionId: toStringValue(row.tenant_subscription_id),
          billingPlanId: toStringValue(row.billing_plan_id),
          billingPlanPriceId: toStringValue(row.billing_plan_price_id),
          polarOrderId: String(row.polar_order_id ?? ""),
          polarCustomerId: String(row.polar_customer_id ?? ""),
          polarSubscriptionId: toStringValue(row.polar_subscription_id),
          polarProductId: toStringValue(row.polar_product_id),
          polarPriceId: toStringValue(row.polar_price_id),
          polarCheckoutId: toStringValue(row.polar_checkout_id),
          status: String(row.status ?? ""),
          billingReason: toStringValue(row.billing_reason),
          isPaid: Boolean(row.is_paid),
          subtotalAmount: toNumberValue(row.subtotal_amount),
          discountAmount: toNumberValue(row.discount_amount),
          netAmount: toNumberValue(row.net_amount),
          taxAmount: toNumberValue(row.tax_amount),
          totalAmount: toNumberValue(row.total_amount),
          refundedAmount: toNumberValue(row.refunded_amount),
          currency: typeof row.currency === "string" ? row.currency : "USD",
          orderNumber: toStringValue(row.order_number),
          invoiceNumber: toStringValue(row.invoice_number),
          invoiceUrl: toStringValue(row.invoice_url),
          receiptUrl: toStringValue(row.receipt_url),
          paidAt: toStringValue(row.paid_at),
          polarCreatedAt: toStringValue(row.polar_created_at),
          polarModifiedAt: toStringValue(row.polar_modified_at),
          lastEventAt: toStringValue(row.last_event_at),
          lastEventId: toStringValue(row.last_event_id),
          lastSyncedAt: toStringValue(row.last_synced_at) ?? new Date().toISOString(),
          syncStatus: typeof row.sync_status === "string" ? row.sync_status : "synced",
          syncErrorCode: toStringValue(row.sync_error_code),
          syncErrorMessage: toStringValue(row.sync_error_message),
          orderMetadata: toRecord(row.order_metadata),
          createdAt: toStringValue(row.created_at) ?? new Date().toISOString(),
          updatedAt: toStringValue(row.updated_at) ?? new Date().toISOString(),
     };
}

function mapBillingRefund(row: Record<string, unknown>): BillingRefund {
     return {
          id: String(row.id ?? ""),
          tenantId: String(row.tenant_id ?? ""),
          billingOrderId: String(row.billing_order_id ?? ""),
          polarRefundId: String(row.polar_refund_id ?? ""),
          polarOrderId: String(row.polar_order_id ?? ""),
          status: String(row.status ?? ""),
          amount: toNumberValue(row.amount),
          currency: typeof row.currency === "string" ? row.currency : "USD",
          reason: toStringValue(row.reason),
          providerReason: toStringValue(row.provider_reason),
          polarCreatedAt: toStringValue(row.polar_created_at),
          polarModifiedAt: toStringValue(row.polar_modified_at),
          lastEventAt: toStringValue(row.last_event_at),
          lastEventId: toStringValue(row.last_event_id),
          lastSyncedAt: toStringValue(row.last_synced_at) ?? new Date().toISOString(),
          syncStatus: typeof row.sync_status === "string" ? row.sync_status : "synced",
          syncErrorCode: toStringValue(row.sync_error_code),
          syncErrorMessage: toStringValue(row.sync_error_message),
          refundMetadata: toRecord(row.refund_metadata),
          createdAt: toStringValue(row.created_at) ?? new Date().toISOString(),
          updatedAt: toStringValue(row.updated_at) ?? new Date().toISOString(),
     };
}

function mapBillingRefunds(value: unknown): BillingRefund[] {
     if (!Array.isArray(value)) {
          return [];
     }

     return value.map((item) => mapBillingRefund(toRecord(item)));
}

export async function listTenantBillingHistory(tenantId: string): Promise<TenantBillingHistoryItem[]> {
     const adminClient = createAdminClient();

     const { data, error } = await adminClient
          .from("billing_orders" as never)
          .select("*, billing_refunds(*)")
          .eq("tenant_id" as never, tenantId)
          .order("created_at" as never, { ascending: false })
          .limit(50);

     if (error) {
          throw new Error(`[billing-history] Unable to load tenant billing history: ${error.message}`);
     }

     const rows = ((data as Array<Record<string, unknown>> | null) ?? []).map((row) => {
          const refunds = mapBillingRefunds(row.billing_refunds);
          const refundedAmount = toNumberValue(row.refunded_amount);
          const totalAmount = toNumberValue(row.total_amount);
          let paymentStatus = "Pending";

          if (Boolean(row.is_paid)) {
               paymentStatus = refundedAmount >= totalAmount && totalAmount > 0 ? "Refunded" : refundedAmount > 0 ? "Partially refunded" : "Paid";
          }

          return {
               id: String(row.id ?? ""),
               orderId: String(row.id ?? ""),
               orderNumber: toStringValue(row.order_number),
               planName: null,
               billingReason: toStringValue(row.billing_reason),
               amount: totalAmount,
               currency: typeof row.currency === "string" ? row.currency : "USD",
               paidAt: toStringValue(row.paid_at),
               paymentStatus,
               refundStatus: refundedAmount > 0 ? (refundedAmount >= totalAmount ? "Refunded" : "Partially refunded") : "None",
               refundedAmount,
               invoiceUrl: toStringValue(row.invoice_url),
               receiptUrl: toStringValue(row.receipt_url),
               order: mapBillingOrder(row),
               refunds,
          } satisfies TenantBillingHistoryItem;
     });

     return rows;
}
