import "server-only";

import {
     claimBillingWebhookEvents,
     markWebhookEventFailed,
     markWebhookEventIgnored,
     markWebhookEventProcessed,
     markWebhookEventRetry,
} from "./billing-webhook-events";
import {
     normalizeWebhookEventType,
     type UnknownRecord,
} from "./polar-normalize";
import { syncPolarProduct } from "./sync-polar-product";
import type { ProcessWebhookResult } from "../types/billing";

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;
const MAX_ATTEMPTS = 10;

class BillingProcessingError extends Error {
     readonly code: string;
     readonly retryable: boolean;

     constructor(code: string, message: string, retryable: boolean) {
          super(message);
          this.code = code;
          this.retryable = retryable;
     }
}

function asRecord(value: unknown): UnknownRecord {
     if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return value as UnknownRecord;
     }
     return {};
}

function toEventType(rawType: string): string {
     return normalizeWebhookEventType(rawType || "unknown");
}

async function processProductEvent(payload: UnknownRecord) {
     const data = asRecord(payload.data);
     const product = asRecord(data.product && typeof data.product === "object" ? data.product : data);

     if (!product.id || typeof product.id !== "string") {
          throw new BillingProcessingError(
               "invalid_payload",
               "Product event payload is missing data.id",
               false
          );
     }

     const result = await syncPolarProduct(product, "webhook");
     if (result.status === "unmapped") {
          throw new BillingProcessingError(
               "unmapped_product",
               `No local billing plan mapping found for product ${result.productId}`,
               false
          );
     }
}

async function dispatchWebhookEvent(eventType: string, payload: UnknownRecord) {
     switch (eventType) {
          case "product.created":
          case "product.updated":
          case "products.created":
          case "products.updated":
               await processProductEvent(payload);
               return "processed" as const;
          default:
               return "ignored" as const;
     }
}

function mapWebhookRow(row: Record<string, unknown>) {
     return {
          id: String(row.id ?? ""),
          eventType: String(row.event_type ?? "unknown"),
          attemptCount: Number(row.attempt_count ?? 0),
          payload: asRecord(row.payload),
     };
}

export async function processBillingWebhookBatch(batchSize = DEFAULT_BATCH_SIZE): Promise<{
     processed: number;
     ignored: number;
     retrying: number;
     failed: number;
     results: ProcessWebhookResult[];
}> {
     const safeBatchSize = Math.min(Math.max(1, batchSize), MAX_BATCH_SIZE);
     const workerId = `billing_worker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

     const claimedRows = await claimBillingWebhookEvents(safeBatchSize, workerId);
     if (claimedRows.length === 0) {
          return { processed: 0, ignored: 0, retrying: 0, failed: 0, results: [] };
     }

     let processed = 0;
     let ignored = 0;
     let retrying = 0;
     let failed = 0;
     const results: ProcessWebhookResult[] = [];

     for (const row of claimedRows) {
          const event = mapWebhookRow(row);

          try {
               const outcome = await dispatchWebhookEvent(
                    toEventType(event.eventType),
                    event.payload
               );

               if (outcome === "ignored") {
                    await markWebhookEventIgnored(event.id, `Unsupported event type: ${event.eventType}`);
                    ignored += 1;
                    results.push({ eventId: event.id, status: "ignored" });
               } else {
                    await markWebhookEventProcessed(event.id);
                    processed += 1;
                    results.push({ eventId: event.id, status: "processed" });
               }
          } catch (error) {
               const typed =
                    error instanceof BillingProcessingError
                         ? error
                         : new BillingProcessingError(
                              "processing_error",
                              error instanceof Error ? error.message : "Unknown webhook processing error",
                              true
                         );

               if (!typed.retryable || event.attemptCount >= MAX_ATTEMPTS) {
                    await markWebhookEventFailed(event.id, typed.code, typed.message);
                    failed += 1;
                    results.push({
                         eventId: event.id,
                         status: "failed",
                         errorCode: typed.code,
                    });
               } else {
                    await markWebhookEventRetry(event.id, event.attemptCount, typed.code, typed.message);
                    retrying += 1;
                    results.push({
                         eventId: event.id,
                         status: "retrying",
                         errorCode: typed.code,
                    });
               }

               console.error("[billing-webhooks] Event processing failed", {
                    eventId: event.id,
                    eventType: event.eventType,
                    errorCode: typed.code,
                    retryable: typed.retryable,
               });
          }
     }

     return { processed, ignored, retrying, failed, results };
}
