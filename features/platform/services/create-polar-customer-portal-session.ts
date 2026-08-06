import "server-only";

import { getAppUrl } from "@/lib/helpers/get-app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPolarCustomerPortalSession } from "./polar-client";

export async function createPolarCustomerPortalSessionForTenant(params: {
     tenantId: string;
     tenantSlug: string;
}): Promise<{ portalUrl: string }> {
     const adminClient = createAdminClient();

     const { data: customer, error } = await adminClient
          .from("tenant_billing_customers" as never)
          .select("polar_customer_id, external_id")
          .eq("tenant_id" as never, params.tenantId)
          .maybeSingle();

     if (error) {
          throw new Error("Unable to load billing customer mapping.");
     }

     if (!customer) {
          throw new Error("Billing customer has not been created yet.");
     }

     const returnUrl = `${getAppUrl()}/${params.tenantSlug}/settings/billing`;

     const result = await createPolarCustomerPortalSession({
          returnUrl,
          polarCustomerId:
               typeof (customer as { polar_customer_id?: unknown }).polar_customer_id === "string"
                    ? ((customer as { polar_customer_id: string }).polar_customer_id as string)
                    : null,
          externalCustomerId:
               typeof (customer as { external_id?: unknown }).external_id === "string"
                    ? ((customer as { external_id: string }).external_id as string)
                    : `tenant:${params.tenantId}`,
     });

     return result;
}
