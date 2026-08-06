import type { PolarRefundSyncResult } from "@/types/billing/financial-sync";
import { createAdminClient } from "@/lib/supabase/admin";

export async function syncPolarRefund(input: {
     polarRefundId: string;
     polarOrderId: string;
     eventId?: string | null;
     eventTimestamp?: string | null;
     syncSource?: string;
     payload?: Record<string, unknown>;
}): Promise<PolarRefundSyncResult> {
     const adminClient = createAdminClient();
     const now = new Date().toISOString();
     const refundStatus = typeof input.payload?.status === "string" ? input.payload.status : "unknown";
     const amount = typeof input.payload?.amount === "number" ? input.payload.amount : 0;
     const currency = typeof input.payload?.currency === "string" ? input.payload.currency.toUpperCase() : "USD";

     const { data: orderRow, error: orderError } = await adminClient
          .from("billing_orders" as never)
          .select("id,tenant_id")
          .eq("polar_order_id" as never, input.polarOrderId)
          .maybeSingle();

     if (orderError) {
          throw new Error(`[billing-refunds] Unable to resolve order: ${orderError.message}`);
     }

     const order = (orderRow as Record<string, unknown> | null) ?? null;
     const payload = {
          tenant_id: order?.tenant_id ?? null,
          billing_order_id: order?.id ?? null,
          polar_refund_id: input.polarRefundId,
          polar_order_id: input.polarOrderId,
          status: refundStatus,
          amount,
          currency,
          reason: typeof input.payload?.reason === "string" ? input.payload.reason : null,
          provider_reason: typeof input.payload?.provider_reason === "string" ? input.payload.provider_reason : null,
          polar_created_at: input.eventTimestamp ?? now,
          polar_modified_at: input.eventTimestamp ?? now,
          last_event_at: input.eventTimestamp ?? now,
          last_event_id: input.eventId ?? null,
          last_synced_at: now,
          sync_status: "synced",
          sync_error_code: null,
          sync_error_message: null,
          refund_metadata: input.payload ?? {},
          created_at: now,
          updated_at: now,
     };

     const { data: upserted, error: upsertError } = await adminClient
          .from("billing_refunds" as never)
          .upsert(payload as never, { onConflict: "polar_refund_id" })
          .select("id")
          .single();

     if (upsertError || !upserted) {
          throw new Error(`[billing-refunds] Upsert failed: ${upsertError?.message ?? "unknown"}`);
     }

     return {
          polarRefundId: input.polarRefundId,
          tenantId: order?.tenant_id ? String(order.tenant_id) : null,
          localRefundId: String((upserted as { id?: unknown }).id ?? ""),
          status: "created",
     };
}
