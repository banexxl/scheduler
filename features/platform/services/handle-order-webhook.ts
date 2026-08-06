import "server-only";

import { syncPolarOrder } from "@/features/billing/services/sync-polar-order";
import type { UnknownRecord } from "./polar-normalize";

export async function handleOrderWebhook(payload: UnknownRecord, eventTimestamp: string, eventId: string) {
     const eventData = payload.data as Record<string, unknown> | undefined;
     const order = eventData && typeof eventData === "object" ? (eventData as UnknownRecord) : {};
     const orderId = typeof order.id === "string" ? order.id : null;

     if (!orderId) {
          return {
               status: "failed" as const,
               reason: "Order event payload is missing data.id",
          };
     }

     const result = await syncPolarOrder({
          polarOrderId: orderId,
          eventId,
          eventTimestamp,
          syncSource: "webhook",
          payload: order,
     });

     return {
          status: result.status === "failed" ? "failed" : "processed",
          reason: null,
          result,
     };
}
