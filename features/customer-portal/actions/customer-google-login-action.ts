"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/helpers/get-app-url";

/**
 * Customer Google OAuth Login — Tenant-scoped.
 *
 * Initiates Google OAuth and passes the tenant slug through the callback
 * so the user lands on the correct portal after authentication.
 *
 * Auto-linking (creating tenant_customers + customer_accounts records)
 * happens on the portal page via the portal session check.
 */
export async function customerGoogleLoginAction(
  tenantSlug: string
): Promise<never> {
  const supabase = await createClient();

  // Callback URL with next param pointing to the tenant portal
  const callbackUrl = `${getAppUrl()}/api/auth/callback?next=/book/${tenantSlug}/portal`;

  console.log("[customer-google-login] Initiating OAuth", { tenantSlug, callbackUrl });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    console.error("[customer-google-login] OAuth initiation failed:", { tenantSlug, callbackUrl, message: error?.message, status: error?.status });
    redirect(`/book/${tenantSlug}/login`);
  }

  console.log("[customer-google-login] OAuth initiated, redirecting to provider", { tenantSlug, hasUrl: Boolean(data.url) });
  redirect(data.url);
}
