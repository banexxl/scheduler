import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PolarCheckoutSyncResult } from "../types/billing-checkout";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
     if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return value as UnknownRecord;
     }
     return {};
}

function asString(value: unknown): string | null {
     return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toIso(value: unknown): string | null {
     const raw = asString(value);
     if (!raw) return null;
     const date = new Date(raw);
     return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapCheckoutStatus(value: string | null):
     | "creating"
     | "open"
     | "updated"
     | "expired"
     | "completed"
     | "failed" {
     const status = (value ?? "").toLowerCase();
     if (status.includes("expired")) return "expired";
     if (status.includes("complete") || status.includes("succeed")) return "completed";
     if (status.includes("update")) return "updated";
     if (status.includes("open") || status.includes("create")) return "open";
     if (status.includes("fail")) return "failed";
     return "updated";
}

function extractCheckoutPayload(payload: UnknownRecord): UnknownRecord {
     const data = asRecord(payload.data);
     if (Object.keys(data).length > 0) return data;
     return payload;
}

export async function syncPolarCheckout(
     payload: UnknownRecord,
     eventTimestamp: string
): Promise<PolarCheckoutSyncResult> {
     const checkout = extractCheckoutPayload(payload);
     const metadata = asRecord(checkout.metadata);

     const polarCheckoutId = asString(checkout.id);
     const checkoutSessionId = asString(metadata.checkout_session_id);
     const tenantId = asString(metadata.tenant_id);
     const requestKey = asString(metadata.request_key);

     const adminClient = createAdminClient();

     let localRow: Record<string, unknown> | null = null;

     if (polarCheckoutId) {
          const { data } = await adminClient
               .from("billing_checkout_sessions" as never)
               .select("*")
               .eq("polar_checkout_id" as never, polarCheckoutId)
               .maybeSingle();
          localRow = (data as Record<string, unknown> | null) ?? null;
     }

     if (!localRow && checkoutSessionId) {
          const { data } = await adminClient
               .from("billing_checkout_sessions" as never)
               .select("*")
               .eq("id" as never, checkoutSessionId)
               .maybeSingle();
          localRow = (data as Record<string, unknown> | null) ?? null;
     }

     if (!localRow && tenantId && requestKey) {
          const { data } = await adminClient
               .from("billing_checkout_sessions" as never)
               .select("*")
               .eq("tenant_id" as never, tenantId)
               .eq("request_key" as never, requestKey)
               .maybeSingle();
          localRow = (data as Record<string, unknown> | null) ?? null;
     }

     if (!localRow) {
          return {
               status: "unresolved",
               checkoutSessionId: checkoutSessionId ?? null,
               polarCheckoutId,
               reason: "No local checkout session match found",
          };
     }

     const localId = String(localRow.id ?? "");
     const localTenantId = String(localRow.tenant_id ?? "");

     if (tenantId && localTenantId !== tenantId) {
          return {
               status: "mismatch",
               checkoutSessionId: localId,
               polarCheckoutId,
               reason: "Tenant mismatch while synchronizing checkout event",
          };
     }

     if (checkoutSessionId && localId !== checkoutSessionId) {
          return {
               status: "mismatch",
               checkoutSessionId: localId,
               polarCheckoutId,
               reason: "Checkout-session-id mismatch",
          };
     }

     const incomingModified = toIso(checkout.modified_at ?? checkout.updated_at ?? eventTimestamp);
     const currentModified = toIso(localRow.polar_modified_at);

     if (incomingModified && currentModified && incomingModified < currentModified) {
          return {
               status: "ignored_stale",
               checkoutSessionId: localId,
               polarCheckoutId,
               reason: "Ignoring stale checkout event",
          };
     }

     const mappedStatus = mapCheckoutStatus(asString(checkout.status));

     const nextMetadata = {
          ...asRecord(localRow.checkout_metadata),
          ...metadata,
     };

     const completedAt =
          mappedStatus === "completed"
               ? toIso(checkout.completed_at) ?? new Date(eventTimestamp).toISOString()
               : null;

     await adminClient
          .from("billing_checkout_sessions" as never)
          .update(
               {
                    polar_checkout_id: polarCheckoutId ?? localRow.polar_checkout_id ?? null,
                    status: mappedStatus,
                    checkout_url:
                         asString(checkout.url ?? checkout.checkout_url) ??
                         localRow.checkout_url ??
                         null,
                    expires_at: toIso(checkout.expires_at) ?? localRow.expires_at ?? null,
                    completed_at: completedAt ?? localRow.completed_at ?? null,
                    polar_created_at:
                         toIso(checkout.created_at) ?? localRow.polar_created_at ?? null,
                    polar_modified_at: incomingModified ?? localRow.polar_modified_at ?? null,
                    checkout_metadata: nextMetadata,
               } as never
          )
          .eq("id" as never, localId);

     return {
          status: "synced",
          checkoutSessionId: localId,
          polarCheckoutId,
     };
}
