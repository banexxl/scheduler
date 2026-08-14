"use server";

/**
 * Initiate Plan Checkout — starts Polar checkout for paid plans without trial.
 *
 * Creates a checkout session and returns the URL for redirect.
 * On successful payment, Polar redirects back to /create-business?plan={planId}.
 */

import { createPolarCheckoutSession } from "@/features/platform/services/polar-client";
import { requireUser } from "@/lib/auth/require-user";
import { getAppUrl } from "@/lib/helpers/get-app-url";

type CheckoutResult =
  | { success: true; checkoutUrl: string }
  | { success: false; message: string };

export async function initiatePlanCheckoutAction(
  polarProductId: string
): Promise<CheckoutResult> {
  try {
    const user = await requireUser();

    const successUrl = `${getAppUrl()}/create-business?plan=paid_confirmed`;
    const returnUrl = `${getAppUrl()}/create-business`;

    const checkout = await createPolarCheckoutSession({
      productId: polarProductId,
      priceId: "", // Polar will use the default price
      successUrl,
      returnUrl,
      externalCustomerId: `user:${user.id}`,
      metadata: {
        purpose: "plan_subscription",
        user_id: user.id,
        user_email: user.email,
      },
    });

    return { success: true, checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    console.error("[initiate-plan-checkout] Failed:", error instanceof Error ? error.message : "unknown");
    return { success: false, message: "Unable to start checkout. Please try again." };
  }
}
