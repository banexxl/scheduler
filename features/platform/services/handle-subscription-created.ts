import "server-only";

import type { UnknownRecord } from "./polar-normalize";
import { syncPolarSubscription } from "./sync-polar-subscription";
import type { PolarSubscriptionSyncResult } from "../types/subscription-sync";

function resolveSubscriptionId(payload: UnknownRecord): string | null {
     const data = (payload.data as UnknownRecord | undefined) ?? {};
     const fromSubscription =
          typeof (data.subscription as UnknownRecord | undefined)?.id === "string"
               ? String((data.subscription as UnknownRecord).id)
               : null;
     const fromData = typeof data.id === "string" ? String(data.id) : null;
     const fromRoot = typeof payload.id === "string" ? String(payload.id) : null;

     return (fromSubscription ?? fromData ?? fromRoot ?? "").trim() || null;
}

export async function handleSubscriptionCreated(
     payload: UnknownRecord,
     eventTimestamp: string,
     eventId: string
): Promise<PolarSubscriptionSyncResult> {
     const polarSubscriptionId = resolveSubscriptionId(payload);
     if (!polarSubscriptionId) {
          throw new Error("Subscription event payload is missing subscription id.");
     }

     return syncPolarSubscription({
          polarSubscriptionId,
          payload,
          eventId,
          eventTimestamp,
          source: "webhook",
     });
}
