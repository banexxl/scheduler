"use server";

import { redirect } from "next/navigation";
import {
     createPolarCheckoutAction,
     createPolarCustomerPortalSessionAction,
     refreshCheckoutStatusAction,
} from "@/features/platform/actions/tenant-billing-actions";

export async function openPortalAction(formData: FormData) {
     const tenantSlug = String(formData.get("tenantSlug") ?? "");
     const result = await createPolarCustomerPortalSessionAction(tenantSlug, {
          intent: "open",
     });

     if (result.success && result.data?.portalUrl) {
          redirect(result.data.portalUrl);
     }
}

export async function startCheckoutAction(formData: FormData) {
     const tenantSlug = String(formData.get("tenantSlug") ?? "");
     const billingPlanPriceId = String(formData.get("billingPlanPriceId") ?? "");
     const requestKey = String(formData.get("requestKey") ?? "");

     const result = await createPolarCheckoutAction(tenantSlug, {
          billingPlanPriceId,
          requestKey,
     });

     if (result.success && result.data?.checkoutUrl) {
          redirect(result.data.checkoutUrl);
     }
}

export async function refreshStatusFormAction(formData: FormData) {
     await refreshCheckoutStatusAction(String(formData.get("tenantSlug") ?? ""), {
          checkoutSessionId: String(formData.get("checkoutSessionId") ?? "") || undefined,
          requestKey: String(formData.get("requestKey") ?? "") || undefined,
     });
}
