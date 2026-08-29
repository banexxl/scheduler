import "server-only";

/**
 * Auto-Link Customer Service.
 *
 * When an authenticated user visits a tenant portal for the first time,
 * this service:
 * 1. Creates a tenant_customers record if none exists for their email
 * 2. Creates a customer_accounts record if none exists for their user_id
 * 3. Creates a customer_account_tenant_links bridge record
 *
 * Used by portal page and post-Google-OAuth flow.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export async function autoLinkCustomerToTenant(input: {
  userId: string;
  email: string;
  fullName?: string | null;
  tenantId: string;
}): Promise<{ customerId: string | null }> {
  const { userId, email, fullName, tenantId } = input;
  const normalizedEmail = email.trim().toLowerCase();
  const adminClient = createAdminClient();

  try {
    // 1. Find or create tenant_customer
    const { data: existingCustomer } = await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("tenant_customers" as never)
      .select("id" as never)
      .eq("tenant_id" as never, tenantId)
      .eq("email" as never, normalizedEmail)
      .maybeSingle();

    let tenantCustomerId: string;

    if (existingCustomer) {
      tenantCustomerId = (existingCustomer as unknown as { id: string }).id;
      // Set user_id if not already set
      await (adminClient as never as ReturnType<typeof createAdminClient>)
        .from("tenant_customers" as never)
        .update({ user_id: userId } as never)
        .eq("id" as never, tenantCustomerId)
        .is("user_id" as never, null);
    } else {
      const { data: newCustomer } = await (adminClient as never as ReturnType<typeof createAdminClient>)
        .from("tenant_customers" as never)
        .insert({
          tenant_id: tenantId,
          email: normalizedEmail,
          name: fullName || normalizedEmail.split("@")[0] || "Customer",
          user_id: userId,
        } as never)
        .select("id")
        .single();

      if (!newCustomer) return { customerId: null };
      tenantCustomerId = (newCustomer as unknown as { id: string }).id;
    }

    // 2. Find or create customer_account
    const { data: existingAccount } = await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("customer_accounts" as never)
      .select("id" as never)
      .eq("user_id" as never, userId)
      .maybeSingle();

    let accountId: string;

    if (existingAccount) {
      accountId = (existingAccount as unknown as { id: string }).id;
    } else {
      const { data: newAccount } = await (adminClient as never as ReturnType<typeof createAdminClient>)
        .from("customer_accounts" as never)
        .insert({
          user_id: userId,
          email: normalizedEmail,
          full_name: fullName || null,
        } as never)
        .select("id")
        .single();

      if (!newAccount) return { customerId: tenantCustomerId };
      accountId = (newAccount as unknown as { id: string }).id;
    }

    // 3. Create link if not exists
    const { data: existingLink } = await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("customer_account_tenant_links" as never)
      .select("id" as never)
      .eq("customer_account_id" as never, accountId)
      .eq("tenant_id" as never, tenantId)
      .eq("link_status" as never, "linked")
      .maybeSingle();

    if (!existingLink) {
      await (adminClient as never as ReturnType<typeof createAdminClient>)
        .from("customer_account_tenant_links" as never)
        .insert({
          customer_account_id: accountId,
          tenant_id: tenantId,
          tenant_customer_id: tenantCustomerId,
          link_status: "linked",
          link_method: "verified_email",
          linked_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
        } as never);
    }

    return { customerId: tenantCustomerId };
  } catch (error) {
    console.error("[auto-link-customer] Error:", error instanceof Error ? error.message : "unknown");
    return { customerId: null };
  }
}
