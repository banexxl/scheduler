import "server-only";

import { syncPolarRefund } from "@/features/billing/services/sync-polar-refund";
import type { UnknownRecord } from "./polar-normalize";

export async function handleRefundWebhook(payload: UnknownRecord, eventTimestamp: string, eventId: string) {
     const eventData = payload.data as Record<string, unknown> | undefined;
     const refund = eventData && typeof eventData === "object" ? (eventData as UnknownRecord) : {};
     const refundId = typeof refund.id === "string" ? refund.id : null;
     const orderId = typeof refund.order_id === "string" ? refund.order_id : null;

     if (!refundId || !orderId) {
          return {
               status: "failed" as const,
               reason: "Refund event payload is missing required identifiers",
          };
     }

     const result = await syncPolarRefund({
          polarRefundId: refundId,
          polarOrderId: orderId,
          eventId,
          eventTimestamp,
          syncSource: "webhook",
          payload: refund,
     });

     return {
          status: result.status === "failed" ? "failed" : "processed",
          reason: null,
          result,
     };
}
