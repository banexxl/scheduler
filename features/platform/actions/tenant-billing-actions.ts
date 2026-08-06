"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createPolarCheckout } from "../services/create-polar-checkout";
import { createPolarCustomerPortalSessionForTenant } from "../services/create-polar-customer-portal-session";
import {
     checkoutCreationSchema,
     customerPortalSessionSchema,
} from "../schemas/tenant-billing-schema";
import { getCheckoutSessionForReturn } from "../services/tenant-billing-queries";

type TenantBillingActionResult<T = undefined> = {
     success: boolean;
     message: string;
     data?: T;
};

const CHECKOUT_RATE_LIMIT = {
     maxRequests: 8,
     windowMs: 10 * 60 * 1000,
};

const PORTAL_RATE_LIMIT = {
     maxRequests: 10,
     windowMs: 10 * 60 * 1000,
};

async function enforceTenantRateLimit(params: {
     tenantId: string;
     userId: string;
     action: string;
     config: { maxRequests: number; windowMs: number };
}): Promise<boolean> {
     const h = await headers();
     const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
     const key = `tenant-billing:${params.tenantId}:${params.userId}:${params.action}:${ip}`;

     return checkRateLimit(key, params.config).allowed;
}

function revalidateTenantBillingRoutes(tenantSlug: string) {
     revalidatePath(`/${tenantSlug}/settings/billing`);
     revalidatePath(`/${tenantSlug}/settings/billing/plans`);
     revalidatePath(`/${tenantSlug}/settings/billing/return`);
}

export async function createPolarCheckoutAction(
     tenantSlug: string,
     input: { billingPlanPriceId: string; requestKey: string }
): Promise<TenantBillingActionResult<{ checkoutUrl: string; checkoutSessionId: string }>> {
     const { tenant, user } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

     const allowed = await enforceTenantRateLimit({
          tenantId: tenant.id,
          userId: user.id,
          action: "checkout",
          config: CHECKOUT_RATE_LIMIT,
     });

     if (!allowed) {
          return {
               success: false,
               message: "Too many checkout attempts. Please wait and try again.",
          };
     }

     try {
          const validated = await checkoutCreationSchema.validate(input, {
               abortEarly: false,
               stripUnknown: true,
          });

          const result = await createPolarCheckout({
               tenantId: tenant.id,
               tenantSlug: tenant.slug,
               requestedBy: user.id,
               billingPlanPriceId: validated.billingPlanPriceId,
               requestKey: validated.requestKey,
          });

          revalidateTenantBillingRoutes(tenant.slug);

          return {
               success: true,
               message: "Checkout created.",
               data: {
                    checkoutUrl: result.checkoutUrl,
                    checkoutSessionId: result.checkoutSessionId,
               },
          };
     } catch (error) {
          const message =
               error instanceof Error ? error.message : "Unable to create checkout session.";

          return {
               success: false,
               message,
          };
     }
}

export async function createPolarCustomerPortalSessionAction(
     tenantSlug: string,
     input: { intent: "open" }
): Promise<TenantBillingActionResult<{ portalUrl: string }>> {
     const { tenant, user } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

     const allowed = await enforceTenantRateLimit({
          tenantId: tenant.id,
          userId: user.id,
          action: "portal",
          config: PORTAL_RATE_LIMIT,
     });

     if (!allowed) {
          return {
               success: false,
               message: "Too many portal attempts. Please wait and try again.",
          };
     }

     try {
          await customerPortalSessionSchema.validate(input, {
               abortEarly: false,
               stripUnknown: true,
          });

          const session = await createPolarCustomerPortalSessionForTenant({
               tenantId: tenant.id,
               tenantSlug: tenant.slug,
          });

          return {
               success: true,
               message: "Portal session created.",
               data: { portalUrl: session.portalUrl },
          };
     } catch (error) {
          const message =
               error instanceof Error
                    ? error.message === "Billing customer has not been created yet."
                         ? "Billing customer has not been created yet."
                         : "Unable to create customer portal session."
                    : "Unable to create customer portal session.";

          return {
               success: false,
               message,
          };
     }
}

export async function refreshCheckoutStatusAction(
     tenantSlug: string,
     input: { checkoutSessionId?: string; requestKey?: string }
): Promise<TenantBillingActionResult<{ status: string | null }>> {
     const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

     const session = await getCheckoutSessionForReturn({
          tenantId: tenant.id,
          checkoutSessionId: input.checkoutSessionId ?? null,
          requestKey: input.requestKey ?? null,
     });

     revalidateTenantBillingRoutes(tenant.slug);

     return {
          success: true,
          message: "Checkout status refreshed.",
          data: {
               status: session ? String(session.status ?? null) : null,
          },
     };
}
