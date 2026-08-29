import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

export type ResolvedUserIdentity = {
  user: User;
  platformAdmin: {
    id: string;
    role: string;
  } | null;
  tenantMemberships: Array<{
    id: string;
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    role: string;
    tenantStatus: string;
  }>;
  /** True if user has an active customer_accounts record */
  isCustomer: boolean;
  /** The slug of the first linked tenant (for customer-only routing) */
  firstCustomerTenantSlug: string | null;
};

/**
 * Resolves the full identity of an authenticated user.
 *
 * Checks three tables to determine role:
 * 1. platform_admins  → Platform administrator
 * 2. tenant_members   → Tenant owner/staff (joined with tenants)
 * 3. customer_accounts → Customer (joined with customer_account_tenant_links → tenants)
 *
 * Uses RLS client for admin/member checks, admin client for customer_accounts
 * (since customer_accounts may not have RLS policies for the auth user).
 */
export async function resolveUserIdentity(
  user: User
): Promise<ResolvedUserIdentity> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const [adminResult, membershipsResult, customerAccountResult] =
    await Promise.all([
      // 1. Check platform admin status
      supabase
        .from("platform_admins")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),

      // 2. Load active tenant memberships with tenant info
      supabase
        .from("tenant_members")
        .select("id, role, tenant_id, status, tenants(id, name, slug, status)")
        .eq("user_id", user.id)
        .eq("status", "active"),

      // 3. Check customer_accounts (global customer profile)
      (adminClient as never as ReturnType<typeof createAdminClient>)
        .from("customer_accounts" as never)
        .select("id, is_active" as never)
        .eq("user_id" as never, user.id)
        .maybeSingle(),
    ]);

  // Parse tenant memberships
  const tenantMemberships = (membershipsResult.data ?? [])
    .filter((m) => m.tenants !== null)
    .map((m) => {
      const tenant = m.tenants as unknown as {
        id: string;
        name: string;
        slug: string;
        status: string;
      };
      return {
        id: m.id,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        role: m.role,
        tenantStatus: tenant.status,
      };
    });

  // Parse customer account
  const customerAccount = customerAccountResult.data as unknown as { id: string; is_active: boolean } | null;
  const isCustomer = Boolean(customerAccount?.is_active);

  // Resolve first customer tenant slug (via customer_account_tenant_links)
  let firstCustomerTenantSlug: string | null = null;
  if (isCustomer && customerAccount) {
    const { data: linkRow } = await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("customer_account_tenant_links" as never)
      .select("tenant_id" as never)
      .eq("customer_account_id" as never, customerAccount.id)
      .eq("link_status" as never, "linked")
      .limit(1)
      .maybeSingle();

    if (linkRow) {
      const tenantId = (linkRow as unknown as { tenant_id: string }).tenant_id;
      const { data: tenantRow } = await adminClient
        .from("tenants")
        .select("slug")
        .eq("id", tenantId)
        .maybeSingle();

      if (tenantRow) {
        firstCustomerTenantSlug = tenantRow.slug;
      }
    }
  }

  return {
    user,
    platformAdmin: adminResult.data
      ? { id: adminResult.data.id, role: adminResult.data.role }
      : null,
    tenantMemberships,
    isCustomer,
    firstCustomerTenantSlug,
  };
}
