import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
     extractWebhookEventTimestamp,
     extractWebhookResourceId,
     normalizeWebhookEventType,
     type UnknownRecord,
} from "./polar-normalize";

function asRecord(value: unknown): UnknownRecord {
     if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return value as UnknownRecord;
     }
     return {};
}

function asString(value: unknown): string | null {
     if (typeof value === "string" && value.trim().length > 0) return value.trim();
     return null;
}

function extractEventId(payload: UnknownRecord): string {
     const fallback = createHash("sha256")
          .update(JSON.stringify(payload), "utf8")
          .digest("hex")
          .slice(0, 32);

     return asString(payload.id) ?? `evt_${fallback}`;
}

export type PersistWebhookEventResult = {
     eventId: string;
     duplicate: boolean;
};

export async function persistBillingWebhookEvent(params: {
     payload: unknown;
     rawBody: string;
}): Promise<PersistWebhookEventResult> {
     const adminClient = createAdminClient();
     const payload = asRecord(params.payload);

     const eventId = extractEventId(payload);
     const eventType = normalizeWebhookEventType(asString(payload.type) ?? "unknown");
     const eventTimestamp = extractWebhookEventTimestamp(payload);
     const organizationId =
          asString(payload.organization_id) ?? asString(asRecord(payload.organization).id);
     const resourceId = extractWebhookResourceId(payload);
     const payloadHash = createHash("sha256")
          .update(params.rawBody, "utf8")
          .digest("hex");

     const row = {
          polar_event_id: eventId,
          event_type: eventType,
          event_timestamp: eventTimestamp,
          organization_id: organizationId,
          resource_id: resourceId,
          payload,
          payload_hash: payloadHash,
          status: "pending",
          next_attempt_at: new Date().toISOString(),
     };

     const { error } = await adminClient
          .from("billing_webhook_events" as never)
          .insert(row as never);

     if (!error) {
          return { eventId, duplicate: false };
     }

     // Postgres duplicate violation.
     if ((error as { code?: string }).code === "23505") {
          return { eventId, duplicate: true };
     }

     throw new Error(`[billing-webhook-events] Insert failed: ${error.message}`);
}

export async function markWebhookEventProcessed(eventId: string) {
     const adminClient = createAdminClient();
     await adminClient
          .from("billing_webhook_events" as never)
          .update(
               {
                    status: "processed",
                    processed_at: new Date().toISOString(),
                    processing_started_at: null,
                    processing_worker_id: null,
                    last_error_code: null,
                    last_error_message: null,
               } as never
          )
          .eq("id" as never, eventId);
}

export async function markWebhookEventIgnored(eventId: string, reason: string) {
     const adminClient = createAdminClient();
     await adminClient
          .from("billing_webhook_events" as never)
          .update(
               {
                    status: "ignored",
                    ignored_at: new Date().toISOString(),
                    processing_started_at: null,
                    processing_worker_id: null,
                    last_error_code: "ignored",
                    last_error_message: reason.slice(0, 1000),
               } as never
          )
          .eq("id" as never, eventId);
}

export async function markWebhookEventRetry(
     eventId: string,
     attemptCount: number,
     errorCode: string,
     safeMessage: string
) {
     const adminClient = createAdminClient();
     const backoffSeconds = Math.min(3600, Math.max(15, Math.pow(2, attemptCount) * 15));
     const nextAttempt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

     await adminClient
          .from("billing_webhook_events" as never)
          .update(
               {
                    status: "pending",
                    next_attempt_at: nextAttempt,
                    processing_started_at: null,
                    processing_worker_id: null,
                    last_error_code: errorCode.slice(0, 120),
                    last_error_message: safeMessage.slice(0, 1000),
               } as never
          )
          .eq("id" as never, eventId);
}

export async function markWebhookEventFailed(
     eventId: string,
     errorCode: string,
     safeMessage: string
) {
     const adminClient = createAdminClient();
     await adminClient
          .from("billing_webhook_events" as never)
          .update(
               {
                    status: "failed",
                    processing_started_at: null,
                    processing_worker_id: null,
                    last_error_code: errorCode.slice(0, 120),
                    last_error_message: safeMessage.slice(0, 1000),
               } as never
          )
          .eq("id" as never, eventId);
}

export async function claimBillingWebhookEvents(batchSize: number, workerId: string) {
     const adminClient = createAdminClient();

     const { data, error } = await adminClient.rpc(
          "claim_billing_webhook_events" as never,
          {
               p_worker_id: workerId,
               p_batch_size: Math.max(1, Math.min(50, batchSize)),
          } as never
     );

     if (error) {
          throw new Error(`[billing-webhook-events] Claim failed: ${error.message}`);
     }

     return (data as Array<Record<string, unknown>> | null) ?? [];
}
