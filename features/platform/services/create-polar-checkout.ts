import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/helpers/get-app-url";
import { createPolarCheckoutSession } from "./polar-client";
import type {
     CheckoutCreationInput,
     CheckoutCreationResult,
} from "../types/billing-checkout";

function asString(value: unknown): string | null {
     return typeof value === "string" && value.length > 0 ? value : null;
}

function mapCheckoutStatus(status: string | null):
     | "creating"
     | "open"
     | "updated"
     | "expired"
     | "completed"
     | "failed" {
     const normalized = (status ?? "").toLowerCase();
     if (normalized.includes("expired")) return "expired";
     if (normalized.includes("complete") || normalized.includes("succeed")) return "completed";
     if (normalized.includes("open") || normalized.includes("created")) return "open";
     if (normalized.includes("update")) return "updated";
     if (normalized.includes("fail")) return "failed";
     return "open";
}

export async function createPolarCheckout(
     input: CheckoutCreationInput
): Promise<CheckoutCreationResult> {
     const adminClient = createAdminClient();

     const { data: selectedPrice, error: priceError } = await adminClient
          .from("billing_plan_prices" as never)
          .select("*")
          .eq("id" as never, input.billingPlanPriceId)
          .maybeSingle();

     if (priceError || !selectedPrice) {
          throw new Error("Selected billing price was not found.");
     }

     const price = selectedPrice as Record<string, unknown>;

     if (!Boolean(price.is_active) || Boolean(price.is_archived)) {
          throw new Error("Selected price is not active.");
     }

     if (!Boolean(price.is_checkout_eligible)) {
          throw new Error("Selected price is not checkout eligible.");
     }

     const planId = String(price.billing_plan_id ?? "");
     const polarProductId = String(price.polar_product_id ?? "");
     const polarPriceId = String(price.polar_price_id ?? "");

     const { data: plan, error: planError } = await adminClient
          .from("billing_plans" as never)
          .select("*")
          .eq("id" as never, planId)
          .maybeSingle();

     if (planError || !plan) {
          throw new Error("Selected billing plan was not found.");
     }

     const planRow = plan as Record<string, unknown>;
     if (!Boolean(planRow.is_active)) {
          throw new Error("Selected billing plan is not active.");
     }

     if (!Boolean(planRow.is_public)) {
          throw new Error("Selected billing plan is not publicly selectable.");
     }

     const existingRequest = await adminClient
          .from("billing_checkout_sessions" as never)
          .select("*")
          .eq("tenant_id" as never, input.tenantId)
          .eq("request_key" as never, input.requestKey)
          .maybeSingle();

     if (existingRequest.error) {
          throw new Error("Unable to verify existing checkout request.");
     }

     const existing = (existingRequest.data as Record<string, unknown> | null) ?? null;
     if (existing) {
          const samePrice = String(existing.billing_plan_price_id ?? "") === input.billingPlanPriceId;

          if (!samePrice) {
               throw new Error("Request key already used for a different price.");
          }

          const status = String(existing.status ?? "");
          const existingUrl = asString(existing.checkout_url);
          const expiredAt = asString(existing.expires_at);
          const isExpired = expiredAt ? new Date(expiredAt).getTime() < Date.now() : false;

          if (existingUrl && !isExpired && ["open", "updated", "creating"].includes(status)) {
               return {
                    checkoutSessionId: String(existing.id),
                    checkoutUrl: existingUrl,
                    status: status as CheckoutCreationResult["status"],
               };
          }

          throw new Error("This checkout request is no longer reusable. Generate a new request.");
     }

     const baseUrl = getAppUrl();
     const successUrl = `${baseUrl}/${input.tenantSlug}/settings/billing/return?checkoutSessionId={CHECKOUT_SESSION_ID}`;
     const returnUrl = `${baseUrl}/${input.tenantSlug}/settings/billing/plans`;
     const externalCustomerId = `tenant:${input.tenantId}`;

     const { data: insertedCheckout, error: insertError } = await adminClient
          .from("billing_checkout_sessions" as never)
          .insert(
               {
                    tenant_id: input.tenantId,
                    requested_by: input.requestedBy,
                    billing_plan_id: planId,
                    billing_plan_price_id: input.billingPlanPriceId,
                    polar_product_id: polarProductId,
                    polar_price_id: polarPriceId,
                    external_customer_id: externalCustomerId,
                    status: "creating",
                    success_url: successUrl,
                    return_url: returnUrl,
                    request_key: input.requestKey,
                    checkout_metadata: {
                         tenant_id: input.tenantId,
                         tenant_slug: input.tenantSlug,
                         billing_plan_id: planId,
                         billing_plan_price_id: input.billingPlanPriceId,
                         request_key: input.requestKey,
                    },
               } as never
          )
          .select("id")
          .single();

     if (insertError || !insertedCheckout) {
          if ((insertError as { code?: string } | null)?.code === "23505") {
               throw new Error("Request key is already in use.");
          }

          throw new Error("Unable to create local checkout session.");
     }

     const checkoutSessionId = String((insertedCheckout as { id: string }).id);

     try {
          const polar = await createPolarCheckoutSession({
               productId: polarProductId,
               priceId: polarPriceId,
               successUrl,
               returnUrl,
               externalCustomerId,
               metadata: {
                    tenant_id: input.tenantId,
                    tenant_slug: input.tenantSlug,
                    billing_plan_id: planId,
                    billing_plan_price_id: input.billingPlanPriceId,
                    checkout_session_id: checkoutSessionId,
                    request_key: input.requestKey,
               },
          });

          const status = mapCheckoutStatus(polar.status);

          await adminClient
               .from("billing_checkout_sessions" as never)
               .update(
                    {
                         polar_checkout_id: polar.checkoutId,
                         checkout_url: polar.checkoutUrl,
                         status,
                         expires_at: polar.expiresAt,
                         polar_created_at: polar.createdAt,
                         polar_modified_at: polar.modifiedAt,
                         checkout_metadata: {
                              tenant_id: input.tenantId,
                              tenant_slug: input.tenantSlug,
                              billing_plan_id: planId,
                              billing_plan_price_id: input.billingPlanPriceId,
                              checkout_session_id: checkoutSessionId,
                              request_key: input.requestKey,
                         },
                    } as never
               )
               .eq("id" as never, checkoutSessionId);

          return {
               checkoutSessionId,
               checkoutUrl: polar.checkoutUrl,
               status,
          };
     } catch (error) {
          await adminClient
               .from("billing_checkout_sessions" as never)
               .update(
                    {
                         status: "failed",
                         checkout_url: null,
                         polar_modified_at: new Date().toISOString(),
                    } as never
               )
               .eq("id" as never, checkoutSessionId);

          throw error;
     }
}
