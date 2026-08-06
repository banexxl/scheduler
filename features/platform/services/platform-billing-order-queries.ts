import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function listPlatformOrders(input?: {
     tenantId?: string;
     planId?: string;
     paidOnly?: boolean;
     refundedOnly?: boolean;
     currency?: string;
     billingReason?: string;
     syncIssueOnly?: boolean;
     limit?: number;
}) {
     const adminClient = createAdminClient();
     const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);

     let query = adminClient
          .from("billing_orders" as never)
          .select("*, tenants(name,slug), billing_plans(name)")
          .order("created_at" as never, { ascending: false })
          .limit(limit);

     if (input?.tenantId) {
          query = query.eq("tenant_id" as never, input.tenantId);
     }
     if (input?.planId) {
          query = query.eq("billing_plan_id" as never, input.planId);
     }
     if (input?.paidOnly) {
          query = query.eq("is_paid" as never, true);
     }
     if (input?.refundedOnly) {
          query = query.gt("refunded_amount" as never, 0);
     }
     if (input?.currency) {
          query = query.eq("currency" as never, input.currency.toUpperCase());
     }
     if (input?.billingReason) {
          query = query.eq("billing_reason" as never, input.billingReason);
     }
     if (input?.syncIssueOnly) {
          query = query.neq("sync_status" as never, "synced");
     }

     const { data, error } = await query;
     if (error) {
          throw new Error(`[platform-billing] Unable to load orders: ${error.message}`);
     }

     return ((data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
          id: String(row.id ?? ""),
          tenantId: String(row.tenant_id ?? ""),
          tenantName: typeof row.tenants === "object" && row.tenants ? String((row.tenants as Record<string, unknown>).name ?? "") : null,
          tenantSlug: typeof row.tenants === "object" && row.tenants ? String((row.tenants as Record<string, unknown>).slug ?? "") : null,
          planName: typeof row.billing_plans === "object" && row.billing_plans ? String((row.billing_plans as Record<string, unknown>).name ?? "") : null,
          polarOrderId: String(row.polar_order_id ?? ""),
          orderNumber: typeof row.order_number === "string" ? row.order_number : null,
          status: String(row.status ?? "unknown"),
          isPaid: Boolean(row.is_paid),
          refundedAmount: Number(row.refunded_amount ?? 0),
          totalAmount: Number(row.total_amount ?? 0),
          currency: typeof row.currency === "string" ? row.currency : "USD",
          billingReason: typeof row.billing_reason === "string" ? row.billing_reason : null,
          createdAt: typeof row.created_at === "string" ? row.created_at : null,
          paidAt: typeof row.paid_at === "string" ? row.paid_at : null,
          lastSyncedAt: typeof row.last_synced_at === "string" ? row.last_synced_at : null,
          syncStatus: typeof row.sync_status === "string" ? row.sync_status : "synced",
     }));
}

export async function listPlatformRefunds(input?: {
     tenantId?: string;
     currency?: string;
     status?: string;
     limit?: number;
}) {
     const adminClient = createAdminClient();
     const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);

     let query = adminClient
          .from("billing_refunds" as never)
          .select("*, tenants(name,slug), billing_orders(order_number,polar_order_id)")
          .order("created_at" as never, { ascending: false })
          .limit(limit);

     if (input?.tenantId) {
          query = query.eq("tenant_id" as never, input.tenantId);
     }
     if (input?.currency) {
          query = query.eq("currency" as never, input.currency.toUpperCase());
     }
     if (input?.status) {
          query = query.eq("status" as never, input.status);
     }

     const { data, error } = await query;
     if (error) {
          throw new Error(`[platform-billing] Unable to load refunds: ${error.message}`);
     }

     return ((data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
          id: String(row.id ?? ""),
          tenantId: String(row.tenant_id ?? ""),
          tenantName: typeof row.tenants === "object" && row.tenants ? String((row.tenants as Record<string, unknown>).name ?? "") : null,
          orderNumber: typeof row.billing_orders === "object" && row.billing_orders ? String((row.billing_orders as Record<string, unknown>).order_number ?? "") : null,
          polarOrderId: String(row.polar_order_id ?? ""),
          polarRefundId: String(row.polar_refund_id ?? ""),
          status: String(row.status ?? "unknown"),
          amount: Number(row.amount ?? 0),
          currency: typeof row.currency === "string" ? row.currency : "USD",
          reason: typeof row.reason === "string" ? row.reason : null,
          createdAt: typeof row.created_at === "string" ? row.created_at : null,
          lastSyncedAt: typeof row.last_synced_at === "string" ? row.last_synced_at : null,
          syncStatus: typeof row.sync_status === "string" ? row.sync_status : "synced",
     }));
}

export async function getPlatformOrderDetail(orderId: string) {
     const adminClient = createAdminClient();

     const { data, error } = await adminClient
          .from("billing_orders" as never)
          .select("*, tenants(name,slug), billing_plans(name), billing_plan_prices(amount,currency), billing_refunds(*)")
          .eq("id" as never, orderId)
          .maybeSingle();

     if (error) {
          throw new Error(`[platform-billing] Unable to load order detail: ${error.message}`);
     }

     return (data as Record<string, unknown> | null) ?? null;
}

export async function getPlatformFinancialCounters() {
     const adminClient = createAdminClient();

     const [ordersResult, refundsResult] = await Promise.all([
          adminClient.from("billing_orders" as never).select("id,is_paid,refunded_amount,total_amount", { count: "exact", head: true }),
          adminClient.from("billing_refunds" as never).select("id", { count: "exact", head: true }),
     ]);

     const ordersCount = ordersResult.count ?? 0;
     const paidOrders = await adminClient
          .from("billing_orders" as never)
          .select("id", { count: "exact", head: true })
          .eq("is_paid" as never, true);

     const partialRefunds = await adminClient
          .from("billing_orders" as never)
          .select("id", { count: "exact", head: true })
          .gt("refunded_amount" as never, 0)
          .lt("refunded_amount" as never, "total_amount" as never);

     const refundedOrders = await adminClient
          .from("billing_orders" as never)
          .select("id", { count: "exact", head: true })
          .gte("refunded_amount" as never, "total_amount" as never);

     const failedOrderSyncs = await adminClient
          .from("billing_orders" as never)
          .select("id", { count: "exact", head: true })
          .neq("sync_status" as never, "synced");

     const failedRefundSyncs = await adminClient
          .from("billing_refunds" as never)
          .select("id", { count: "exact", head: true })
          .neq("sync_status" as never, "synced");

     return {
          paidOrders: paidOrders.count ?? 0,
          ordersToday: 0,
          refundedOrders: refundedOrders.count ?? 0,
          partialRefunds: partialRefunds.count ?? 0,
          failedOrderSyncs: failedOrderSyncs.count ?? 0,
          failedRefundSyncs: failedRefundSyncs.count ?? 0,
          totalOrders: ordersCount,
          totalRefunds: refundsResult.count ?? 0,
     };
}
