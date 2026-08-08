import "server-only";

/**
 * Customer Account Link Service — Milestone 9.1.
 *
 * Handles discovery and linking of tenant customer records
 * to global customer accounts.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomerAccountLinkResult, LinkMethod } from "../types/customer-account";

/**
 * Attempts to link a tenant customer to a global account.
 *
 * Requirements:
 * - Auth email must be verified
 * - Exact normalized email match
 * - Tenant customer has no existing active link
 * - No duplicate tenant customers with same email
 */
export async function linkTenantCustomerToAccount(input: {
  customerAccountId: string;
  tenantId: string;
  verifiedEmail: string;
  linkMethod: LinkMethod;
}): Promise<CustomerAccountLinkResult> {
  const supabase = createAdminClient();
  const normalizedEmail = input.verifiedEmail.trim().toLowerCase();

  // Find matching tenant customers by email
  const { data: candidates } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_customers" as never)
    .select("id" as never)
    .eq("tenant_id" as never, input.tenantId)
    .eq("email" as never, normalizedEmail);

  const matches = (candidates ?? []) as unknown as Array<{ id: string }>;

  if (matches.length === 0) {
    return { status: "no_match" };
  }

  if (matches.length > 1) {
    return { status: "conflict" };
  }

  const tenantCustomerId = matches[0]!.id;

  // Check if already linked
  const { data: existingLink } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_account_tenant_links" as never)
    .select("id, link_status, customer_account_id" as never)
    .eq("tenant_id" as never, input.tenantId)
    .eq("tenant_customer_id" as never, tenantCustomerId)
    .eq("link_status" as never, "linked")
    .single();

  if (existingLink) {
    const existing = existingLink as unknown as { id: string; customer_account_id: string };
    if (existing.customer_account_id === input.customerAccountId) {
      return { status: "already_linked", linkId: existing.id };
    }
    // Linked to a different account
    return { status: "conflict" };
  }

  // Create link
  const { data: linkRow, error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_account_tenant_links" as never)
    .insert({
      customer_account_id: input.customerAccountId,
      tenant_id: input.tenantId,
      tenant_customer_id: tenantCustomerId,
      link_status: "linked",
      link_method: input.linkMethod,
      linked_at: new Date().toISOString(),
      verified_at: new Date().toISOString(),
    } as never)
    .select("id")
    .single();

  if (error || !linkRow) {
    return { status: "conflict" };
  }

  return { status: "linked", linkId: (linkRow as unknown as { id: string }).id };
}
