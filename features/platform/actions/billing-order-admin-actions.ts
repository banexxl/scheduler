"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function reconcileOrderAdminAction(orderId: string) {
     const adminClient = createAdminClient();
     const { data, error } = await adminClient
          .from("billing_orders" as never)
          .select("id")
          .eq("id" as never, orderId)
          .maybeSingle();

     if (error) {
          throw new Error(`[platform-billing] Unable to locate order: ${error.message}`);
     }

     return {
          success: Boolean(data),
          orderId,
     };
}

export async function reconcileRefundAdminAction(refundId: string) {
     const adminClient = createAdminClient();
     const { data, error } = await adminClient
          .from("billing_refunds" as never)
          .select("id")
          .eq("id" as never, refundId)
          .maybeSingle();

     if (error) {
          throw new Error(`[platform-billing] Unable to locate refund: ${error.message}`);
     }

     return {
          success: Boolean(data),
          refundId,
     };
}
