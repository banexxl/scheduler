import type { PolarOrderSyncResult } from "@/types/billing/financial-sync";
import { createAdminClient } from "@/lib/supabase/admin";

export async function syncPolarOrder(input: {
     polarOrderId: string;
     eventId?: string | null;
     eventTimestamp?: string | null;
     syncSource?: string;
     payload?: Record<string, unknown>;
}): Promise<PolarOrderSyncResult> {
     const adminClient = createAdminClient();
     const polarOrderId = input.polarOrderId;

     const result: PolarOrderSyncResult = {
          polarOrderId,
          tenantId: null,
          localOrderId: null,
          status: "created",
          becamePaid: false,
          refundStateChanged: false,
     };

     const { data: existingOrder, error: existingError } = await adminClient
          .from("billing_orders" as never)
          .select("id,tenant_id,polar_order_id,status,is_paid,refunded_amount,last_event_id")
          .eq("polar_order_id" as never, polarOrderId)
          .maybeSingle();

     if (existingError) {
          throw new Error(`[billing-orders] Unable to load existing order: ${existingError.message}`);
     }

     const existing = (existingOrder as Record<string, unknown> | null) ?? null;
     const orderStatus = typeof input.payload?.status === "string" ? input.payload.status : "unknown";
     const isPaid = Boolean(input.payload?.is_paid) || orderStatus.toLowerCase() === "paid";
     const refundedAmount = typeof input.payload?.refunded_amount === "number" ? input.payload.refunded_amount : 0;
     const currency = typeof input.payload?.currency === "string" ? input.payload.currency.toUpperCase() : "USD";
     const now = new Date().toISOString();

     const payload = {
          tenant_id: null,
          tenant_billing_customer_id: null,
          tenant_subscription_id: null,
          billing_plan_id: null,
          billing_plan_price_id: null,
          polar_order_id: polarOrderId,
          polar_customer_id: input.payload?.customer_id ?? input.payload?.polar_customer_id ?? "",
          polar_subscription_id: null,
          polar_product_id: null,
          polar_price_id: null,
          polar_checkout_id: null,
          status: orderStatus,
          billing_reason: typeof input.payload?.billing_reason === "string" ? input.payload.billing_reason : null,
          is_paid: isPaid,
          subtotal_amount: typeof input.payload?.subtotal_amount === "number" ? input.payload.subtotal_amount : 0,
          discount_amount: typeof input.payload?.discount_amount === "number" ? input.payload.discount_amount : 0,
          net_amount: typeof input.payload?.net_amount === "number" ? input.payload.net_amount : 0,
          tax_amount: typeof input.payload?.tax_amount === "number" ? input.payload.tax_amount : 0,
          total_amount: typeof input.payload?.total_amount === "number" ? input.payload.total_amount : 0,
          refunded_amount: refundedAmount,
          currency,
          order_number: typeof input.payload?.order_number === "string" ? input.payload.order_number : null,
          invoice_number: typeof input.payload?.invoice_number === "string" ? input.payload.invoice_number : null,
          invoice_url: typeof input.payload?.invoice_url === "string" ? input.payload.invoice_url : null,
          receipt_url: typeof input.payload?.receipt_url === "string" ? input.payload.receipt_url : null,
          paid_at: isPaid ? now : null,
          polar_created_at: input.eventTimestamp ?? now,
          polar_modified_at: input.eventTimestamp ?? now,
          last_event_at: input.eventTimestamp ?? now,
          last_event_id: input.eventId ?? null,
          last_synced_at: now,
          sync_status: "synced",
          sync_error_code: null,
          sync_error_message: null,
          order_metadata: input.payload ?? {},
          created_at: existing?.created_at ?? now,
          updated_at: now,
     };

     const { data: upserted, error: upsertError } = await adminClient
          .from("billing_orders" as never)
          .upsert(payload as never, { onConflict: "polar_order_id" })
          .select("id,tenant_id")
          .single();

     if (upsertError || !upserted) {
          throw new Error(`[billing-orders] Upsert failed: ${upsertError?.message ?? "unknown"}`);
     }

     result.localOrderId = String((upserted as { id?: unknown }).id ?? "");
     result.tenantId = existing?.tenant_id ? String(existing.tenant_id) : null;
     result.status = existing ? "updated" : "created";
     result.becamePaid = Boolean(isPaid && !existing?.is_paid);
     result.refundStateChanged = Boolean(refundedAmount !== Number(existing?.refunded_amount ?? 0));

     return result;
}
