"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import {
     billingPlanReorderSchema,
     billingPlanUpsertSchema,
     manualSyncSchema,
     webhookRetrySchema,
} from "../schemas/billing-plan-admin-schema";
import {
     discoverPolarProductsForMapping,
     listBillingWebhookDiagnostics,
} from "../services/platform-billing-admin-queries";
import { listPolarProducts } from "../services/polar-client";
import { syncAllPolarProducts, syncPolarProduct } from "../services/sync-polar-product";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";

type AdminActionResult<T = undefined> = {
     success: boolean;
     message: string;
     data?: T;
};

const PLATFORM_WRITE_LIMIT = {
     maxRequests: 30,
     windowMs: 10 * 60 * 1000,
};

async function enforcePlatformRateLimit(actionName: string): Promise<
     { success: false; message: string } | null
> {
     const h = await headers();
     const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
     const limiterKey = `platform:${actionName}:${ip}`;

     const result = checkRateLimit(limiterKey, PLATFORM_WRITE_LIMIT);
     if (!result.allowed) {
          return {
               success: false,
               message: "Too many requests. Please wait and try again.",
          };
     }

     return null;
}

function revalidatePlatformBillingRoutes() {
     revalidatePath("/platform");
     revalidatePath("/platform/billing");
     revalidatePath("/platform/billing/plans");
     revalidatePath("/platform/billing/products");
     revalidatePath("/platform/billing/webhooks");
}

export async function createBillingPlanAction(input: {
     planKey: string;
     name: string;
     description?: string | null;
     isFree: boolean;
     isActive: boolean;
     isPublic: boolean;
     sortOrder: number;
}): Promise<AdminActionResult<{ planId: string }>> {
     await requirePlatformAdmin();

     const limited = await enforcePlatformRateLimit("create-plan");
     if (limited) return limited;

     try {
          const validated = await billingPlanUpsertSchema.validate(input, {
               abortEarly: false,
               stripUnknown: true,
          });

          const adminClient = createAdminClient();
          const { data, error } = await adminClient
               .from("billing_plans" as never)
               .insert(
                    {
                         plan_key: validated.planKey,
                         name: validated.name,
                         description: validated.description ?? null,
                         is_free: validated.isFree,
                         is_active: validated.isActive,
                         is_public: validated.isPublic,
                         sort_order: validated.sortOrder,
                         product_metadata: {
                              application: "scheduling-platform",
                              plan_key: validated.planKey,
                         },
                    } as never
               )
               .select("id")
               .single();

          if (error) {
               if ((error as { code?: string }).code === "23505") {
                    return { success: false, message: "Plan key already exists." };
               }
               return { success: false, message: "Unable to create billing plan." };
          }

          revalidatePlatformBillingRoutes();

          return {
               success: true,
               message: "Billing plan created.",
               data: { planId: String((data as { id: string }).id) },
          };
     } catch {
          return { success: false, message: "Invalid billing plan data." };
     }
}

export async function updateBillingPlanAction(input: {
     id: string;
     name: string;
     description?: string | null;
     isFree: boolean;
     isActive: boolean;
     isPublic: boolean;
     sortOrder: number;
}): Promise<AdminActionResult> {
     await requirePlatformAdmin();

     const limited = await enforcePlatformRateLimit("update-plan");
     if (limited) return limited;

     const adminClient = createAdminClient();

     try {
          const { data: existingPlan } = await adminClient
               .from("billing_plans" as never)
               .select("id, plan_key")
               .eq("id" as never, input.id)
               .single();

          if (!existingPlan) {
               return { success: false, message: "Billing plan was not found." };
          }

          const validated = await billingPlanUpsertSchema.validate(
               {
                    ...input,
                    planKey: String((existingPlan as { plan_key: string }).plan_key),
               },
               {
                    abortEarly: false,
                    stripUnknown: true,
               }
          );

          const { error } = await adminClient
               .from("billing_plans" as never)
               .update(
                    {
                         name: validated.name,
                         description: validated.description ?? null,
                         is_free: validated.isFree,
                         is_active: validated.isActive,
                         is_public: validated.isPublic,
                         sort_order: validated.sortOrder,
                    } as never
               )
               .eq("id" as never, input.id);

          if (error) {
               return { success: false, message: "Unable to update billing plan." };
          }

          revalidatePlatformBillingRoutes();
          return { success: true, message: "Billing plan updated." };
     } catch {
          return { success: false, message: "Invalid billing plan data." };
     }
}

export async function toggleBillingPlanActiveAction(
     planId: string,
     isActive: boolean
): Promise<AdminActionResult> {
     await requirePlatformAdmin();

     const adminClient = createAdminClient();
     const { error } = await adminClient
          .from("billing_plans" as never)
          .update({ is_active: isActive } as never)
          .eq("id" as never, planId);

     if (error) {
          return { success: false, message: "Unable to update plan active state." };
     }

     revalidatePlatformBillingRoutes();
     return {
          success: true,
          message: isActive ? "Plan activated." : "Plan deactivated.",
     };
}

export async function toggleBillingPlanPublicAction(
     planId: string,
     isPublic: boolean
): Promise<AdminActionResult> {
     await requirePlatformAdmin();

     const adminClient = createAdminClient();
     const { error } = await adminClient
          .from("billing_plans" as never)
          .update({ is_public: isPublic } as never)
          .eq("id" as never, planId);

     if (error) {
          return { success: false, message: "Unable to update plan visibility." };
     }

     revalidatePlatformBillingRoutes();
     return {
          success: true,
          message: isPublic ? "Plan is now public." : "Plan hidden from checkout.",
     };
}

export async function reorderBillingPlansAction(input: {
     orderedPlanIds: string[];
}): Promise<AdminActionResult> {
     await requirePlatformAdmin();

     try {
          const validated = await billingPlanReorderSchema.validate(input, {
               abortEarly: false,
               stripUnknown: true,
          });

          const adminClient = createAdminClient();
          for (let index = 0; index < validated.orderedPlanIds.length; index += 1) {
               const id = validated.orderedPlanIds[index]!;
               await adminClient
                    .from("billing_plans" as never)
                    .update({ sort_order: index } as never)
                    .eq("id" as never, id);
          }

          revalidatePlatformBillingRoutes();

          return {
               success: true,
               message: "Billing plan order updated.",
          };
     } catch {
          return { success: false, message: "Invalid plan order payload." };
     }
}

export async function retryBillingWebhookEventAction(
     input: { eventId: string }
): Promise<AdminActionResult> {
     await requirePlatformAdmin();

     try {
          const validated = await webhookRetrySchema.validate(input, {
               abortEarly: false,
               stripUnknown: true,
          });

          const adminClient = createAdminClient();
          const { data: event, error: loadError } = await adminClient
               .from("billing_webhook_events" as never)
               .select("id,status")
               .eq("id" as never, validated.eventId)
               .maybeSingle();

          if (loadError || !event) {
               return { success: false, message: "Webhook event was not found." };
          }

          if ((event as { status: string }).status !== "failed") {
               return {
                    success: false,
                    message: "Only failed events can be retried from this screen.",
               };
          }

          const { error } = await adminClient
               .from("billing_webhook_events" as never)
               .update(
                    {
                         status: "pending",
                         next_attempt_at: new Date().toISOString(),
                         processing_started_at: null,
                         processing_worker_id: null,
                         last_error_code: null,
                         last_error_message: null,
                    } as never
               )
               .eq("id" as never, validated.eventId);

          if (error) {
               return { success: false, message: "Unable to retry webhook event." };
          }

          revalidatePlatformBillingRoutes();
          return { success: true, message: "Webhook event queued for retry." };
     } catch {
          return { success: false, message: "Invalid webhook event id." };
     }
}

export async function refreshAllMappedProductsAction(
     input: { batchSize?: number } = {}
): Promise<AdminActionResult<Record<string, number>>> {
     await requirePlatformAdmin();

     try {
          await manualSyncSchema.validate(input, { abortEarly: false, stripUnknown: true });

          const counters = await syncAllPolarProducts({
               source: "manual",
               runType: "product_sync",
               requestedBy: "platform-admin",
          });

          revalidatePlatformBillingRoutes();

          return {
               success: true,
               message: "Product synchronization completed.",
               data: counters,
          };
     } catch {
          return { success: false, message: "Unable to refresh products." };
     }
}

export async function refreshSinglePolarProductAction(
     polarProductId: string
): Promise<AdminActionResult> {
     await requirePlatformAdmin();

     if (!polarProductId) {
          return { success: false, message: "Polar product id is required." };
     }

     try {
          const products = await listPolarProducts();
          const product = products.find((row) => row.id === polarProductId);

          if (!product) {
               return { success: false, message: "Polar product was not found." };
          }

          const result = await syncPolarProduct(product, "manual");
          revalidatePlatformBillingRoutes();

          return {
               success: true,
               message:
                    result.status === "synced"
                         ? "Product refreshed successfully."
                         : result.status === "unmapped"
                              ? "Product has no local plan mapping."
                              : "Product refresh skipped due to stale event ordering.",
          };
     } catch {
          return { success: false, message: "Unable to refresh this product." };
     }
}

export async function discoverPolarProductsAction(): Promise<
     AdminActionResult<Awaited<ReturnType<typeof discoverPolarProductsForMapping>>>
> {
     await requirePlatformAdmin();

     try {
          const data = await discoverPolarProductsForMapping();
          return {
               success: true,
               message: "Discovery completed.",
               data,
          };
     } catch {
          return { success: false, message: "Unable to discover Polar products." };
     }
}

export async function getWebhookPageDataAction() {
     await requirePlatformAdmin();
     return listBillingWebhookDiagnostics(200);
}
