import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PolarCustomerSyncResult } from "../types/billing-customer";

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

function extractCustomerPayload(payload: UnknownRecord): UnknownRecord {
     const data = asRecord(payload.data);
     return Object.keys(data).length > 0 ? data : payload;
}

function parseTenantIdFromExternalId(externalId: string | null): string | null {
     if (!externalId) return null;
     const match = /^tenant:([0-9a-fA-F-]{36})$/.exec(externalId);
     return match ? match[1]! : null;
}

async function resolveTenantId(params: {
     adminClient: ReturnType<typeof createAdminClient>;
     polarCustomerId: string | null;
     externalId: string | null;
     metadata: UnknownRecord;
}): Promise<string | null> {
     const { adminClient, polarCustomerId, externalId, metadata } = params;

     if (polarCustomerId) {
          const { data } = await adminClient
               .from("tenant_billing_customers" as never)
               .select("tenant_id")
               .eq("polar_customer_id" as never, polarCustomerId)
               .maybeSingle();

          if (data && typeof (data as { tenant_id?: unknown }).tenant_id === "string") {
               return (data as { tenant_id: string }).tenant_id;
          }
     }

     const tenantFromExternal = parseTenantIdFromExternalId(externalId);
     if (tenantFromExternal) return tenantFromExternal;

     const checkoutSessionId = asString(metadata.checkout_session_id);
     if (checkoutSessionId) {
          const { data } = await adminClient
               .from("billing_checkout_sessions" as never)
               .select("tenant_id")
               .eq("id" as never, checkoutSessionId)
               .maybeSingle();

          if (data && typeof (data as { tenant_id?: unknown }).tenant_id === "string") {
               return (data as { tenant_id: string }).tenant_id;
          }
     }

     const tenantId = asString(metadata.tenant_id);
     const requestKey = asString(metadata.request_key);
     if (tenantId && requestKey) {
          const { data } = await adminClient
               .from("billing_checkout_sessions" as never)
               .select("id")
               .eq("tenant_id" as never, tenantId)
               .eq("request_key" as never, requestKey)
               .maybeSingle();

          if (data) return tenantId;
     }

     return null;
}

export async function syncPolarCustomer(
     payload: UnknownRecord,
     eventTimestamp: string
): Promise<PolarCustomerSyncResult> {
     const adminClient = createAdminClient();
     const customer = extractCustomerPayload(payload);

     const polarCustomerId = asString(customer.id);
     const externalId = asString(customer.external_id);
     const metadata = asRecord(customer.metadata);

     const tenantId = await resolveTenantId({
          adminClient,
          polarCustomerId,
          externalId,
          metadata,
     });

     if (!tenantId) {
          return {
               status: "unresolved",
               tenantId: null,
               customerId: polarCustomerId,
               reason: "Unable to resolve tenant for customer event",
          };
     }

     const incomingModified =
          toIso(customer.modified_at ?? customer.updated_at) ??
          toIso(eventTimestamp) ??
          new Date().toISOString();

     const { data: existing } = await adminClient
          .from("tenant_billing_customers" as never)
          .select("id, polar_modified_at, last_event_at")
          .eq("tenant_id" as never, tenantId)
          .maybeSingle();

     if (existing) {
          const localModified = toIso((existing as { polar_modified_at?: unknown }).polar_modified_at);
          const localEvent = toIso((existing as { last_event_at?: unknown }).last_event_at);

          if ((localModified && incomingModified < localModified) || (localEvent && incomingModified < localEvent)) {
               return {
                    status: "ignored_stale",
                    tenantId,
                    customerId: polarCustomerId,
                    reason: "Ignoring stale customer event",
               };
          }
     }

     const state = asString(customer.state ?? customer.customer_type);
     const isDeleted =
          Boolean(customer.deleted) ||
          state === "deleted" ||
          asString(payload.type)?.toLowerCase() === "customer.deleted";

     const upsertPayload = {
          tenant_id: tenantId,
          polar_customer_id: polarCustomerId,
          external_id: externalId ?? `tenant:${tenantId}`,
          email: asString(customer.email),
          name: asString(customer.name),
          customer_type: state,
          is_deleted: isDeleted,
          customer_metadata: metadata,
          polar_created_at: toIso(customer.created_at),
          polar_modified_at: incomingModified,
          last_event_at: toIso(eventTimestamp) ?? incomingModified,
          last_synced_at: new Date().toISOString(),
     };

     const { error } = await adminClient
          .from("tenant_billing_customers" as never)
          .upsert(upsertPayload as never, {
               onConflict: "tenant_id",
          });

     if (error) {
          throw new Error(`[billing-customer] Sync failed: ${error.message}`);
     }

     return {
          status: "synced",
          tenantId,
          customerId: polarCustomerId,
     };
}
