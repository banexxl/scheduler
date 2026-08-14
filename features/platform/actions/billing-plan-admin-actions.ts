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
     /** Pricing — required for paid plans */
     priceAmount?: number; // minor units (cents)
     priceCurrency?: string; // e.g. "usd"
     isRecurring?: boolean;
     recurringInterval?: "month" | "year";
     recurringIntervalCount?: number;
     trialDays?: number;
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

          // For paid plans, create Polar product first
          let polarProductId: string | null = null;
          let polarPriceId: string | null = null;
          let polarCreatedAt: string | null = null;

          if (!validated.isFree && input.priceAmount && input.priceCurrency) {
               try {
                    const { createPolarProduct } = await import("../services/polar-client");
                    const polarResult = await createPolarProduct({
                         name: validated.name,
                         description: validated.description ?? undefined,
                         isRecurring: input.isRecurring ?? true,
                         recurringInterval: input.recurringInterval ?? "month",
                         recurringIntervalCount: input.recurringIntervalCount ?? 1,
                         priceAmount: input.priceAmount,
                         priceCurrency: input.priceCurrency,
                         trialDays: input.trialDays ?? undefined,
                         metadata: {
                              application: "scheduling-platform",
                              plan_key: validated.planKey,
                         },
                    });
                    polarProductId = polarResult.productId;
                    polarPriceId = polarResult.priceId;
                    polarCreatedAt = polarResult.createdAt;
               } catch (polarError) {
                    return {
                         success: false,
                         message: `Plan not created: Polar API error — ${polarError instanceof Error ? polarError.message : "unknown error"}`,
                    };
               }
          }

          // Insert local plan
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
                         polar_product_id: polarProductId,
                         polar_product_name: validated.name,
                         polar_product_description: validated.description ?? null,
                         polar_created_at: polarCreatedAt,
                         last_synced_at: polarProductId ? new Date().toISOString() : null,
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

          // If we have a price, insert into billing_plan_prices
          if (polarPriceId && polarProductId && input.priceAmount && input.priceCurrency) {
               await adminClient
                    .from("billing_plan_prices" as never)
                    .insert({
                         billing_plan_id: (data as { id: string }).id,
                         polar_product_id: polarProductId,
                         polar_price_id: polarPriceId,
                         price_type: input.isRecurring ? "recurring" : "one_time",
                         amount: input.priceAmount,
                         currency: input.priceCurrency,
                         billing_interval: input.recurringInterval ?? null,
                         billing_interval_count: input.recurringIntervalCount ?? null,
                         is_recurring: input.isRecurring ?? true,
                         is_active: true,
                         is_archived: false,
                         is_checkout_eligible: true,
                         last_synced_at: new Date().toISOString(),
                         polar_created_at: polarCreatedAt,
                    } as never);
          }

          revalidatePlatformBillingRoutes();

          return {
               success: true,
               message: polarProductId
                    ? "Billing plan created and synced to Polar."
                    : "Billing plan created (free plan — no Polar product).",
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
               .select("id, plan_key, polar_product_id, is_active")
               .eq("id" as never, input.id)
               .single();

          if (!existingPlan) {
               return { success: false, message: "Billing plan was not found." };
          }

          const plan = existingPlan as unknown as { id: string; plan_key: string; polar_product_id: string | null; is_active: boolean };

          const validated = await billingPlanUpsertSchema.validate(
               {
                    ...input,
                    planKey: plan.plan_key,
               },
               {
                    abortEarly: false,
                    stripUnknown: true,
               }
          );

          // Update local plan
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
                         polar_product_name: validated.name,
                         polar_product_description: validated.description ?? null,
                         last_synced_at: plan.polar_product_id ? new Date().toISOString() : null,
                    } as never
               )
               .eq("id" as never, input.id);

          if (error) {
               return { success: false, message: "Unable to update billing plan." };
          }

          // Sync to Polar if product is mapped
          if (plan.polar_product_id) {
               try {
                    const { updatePolarProduct } = await import("../services/polar-client");
                    await updatePolarProduct(plan.polar_product_id, {
                         name: validated.name,
                         description: validated.description ?? null,
                         isArchived: !validated.isActive,
                    });
               } catch (polarError) {
                    // Local update succeeded but Polar sync failed — not fatal
                    // Next webhook or manual refresh will reconcile
                    console.error("[billing-plan] Polar sync failed:", polarError instanceof Error ? polarError.message : "unknown");
               }
          }

          revalidatePlatformBillingRoutes();
          return {
               success: true,
               message: plan.polar_product_id
                    ? "Billing plan updated and synced to Polar."
                    : "Billing plan updated.",
          };
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

     // Load plan to get polar_product_id
     const { data: plan } = await adminClient
          .from("billing_plans" as never)
          .select("id, polar_product_id" as never)
          .eq("id" as never, planId)
          .single();

     const { error } = await adminClient
          .from("billing_plans" as never)
          .update({ is_active: isActive } as never)
          .eq("id" as never, planId);

     if (error) {
          return { success: false, message: "Unable to update plan active state." };
     }

     // Sync archive state to Polar
     const polarProductId = (plan as unknown as { polar_product_id: string | null } | null)?.polar_product_id;
     if (polarProductId) {
          try {
               const { updatePolarProduct } = await import("../services/polar-client");
               await updatePolarProduct(polarProductId, { isArchived: !isActive });
          } catch {
               // Non-fatal — webhook will reconcile
          }
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
