import "server-only";

import { notFound } from "next/navigation";
import { requireCustomerAccount, type CustomerAccountContext } from "./require-customer-account";
import { createAdminClient } from "@/lib/supabase/admin";

export type LinkedTenantCustomerContext = CustomerAccountContext & {
  tenantId: string;
  tenantCustomerId: string;
  linkId: string;
};

/**
 * Requires an authenticated customer account with an active verified link
 * to the specified tenant.
 *
 * Authorization chain:
 *   auth.uid() → customer_accounts → customer_account_tenant_links
 *   → link_status = 'linked' → tenant_customer_id
 *
 * Rejects: pending, revoked, conflict link statuses.
 * Calls notFound() when link does not exist (does not reveal tenant existence).
 */
export async function requireLinkedTenantCustomer(
  tenantSlug: string
): Promise<LinkedTenantCustomerContext> {
  const ctx = await requireCustomerAccount();

  const supabase = createAdminClient();

  // Resolve tenant by slug
  const { data: tenantRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenants" as never)
    .select("id" as never)
    .eq("slug" as never, tenantSlug)
    .single();

  if (!tenantRow) {
    notFound();
  }

  const tenantId = (tenantRow as unknown as { id: string }).id;

  // Verify active link (ONLY 'linked' status grants access)
  const { data: linkRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_account_tenant_links" as never)
    .select("id, tenant_customer_id" as never)
    .eq("customer_account_id" as never, ctx.account.id)
    .eq("tenant_id" as never, tenantId)
    .eq("link_status" as never, "linked")
    .single();

  if (!linkRow) {
    notFound();
  }

  const link = linkRow as unknown as { id: string; tenant_customer_id: string };

  return {
    ...ctx,
    tenantId,
    tenantCustomerId: link.tenant_customer_id,
    linkId: link.id,
  };
}
