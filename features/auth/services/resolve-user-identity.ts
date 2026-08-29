import "server-only";
import { createClient } from "@/lib/supabase/server";
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
  tenantCustomerCount: number;
  /** The slug of the first linked tenant (for customer-only routing) */
  firstCustomerTenantSlug: string | null;
};

/**
 * Resolves the full identity of an authenticated user.
 *
 * Queries (run in parallel):
 * - platform_admins (active only)
 * - tenant_members (active status) with their tenants
 * - tenant_customers count
 *
 * Uses RLS — never uses the admin client.
 * Only includes tenant memberships where the member status is "active".
 */
export async function resolveUserIdentity(
  user: User
): Promise<ResolvedUserIdentity> {
  const supabase = await createClient();

  const [adminResult, membershipsResult, customerCountResult] =
    await Promise.all([
      // Check platform admin status
      supabase
        .from("platform_admins")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single(),

      // Load active tenant memberships with tenant info
      supabase
        .from("tenant_members")
        .select("id, role, tenant_id, status, tenants(id, name, slug, status)")
        .eq("user_id", user.id)
        .eq("status", "active"),

      // Count tenant customer relationships
      supabase
        .from("tenant_customers")
        .select("id, tenant_id", { count: "exact" })
        .eq("user_id", user.id)
        .limit(1),
    ]);

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

  // Resolve first customer tenant slug
  let firstCustomerTenantSlug: string | null = null;
  const customerRows = (customerCountResult.data ?? []) as unknown as Array<{ id: string; tenant_id: string }>;
  if (customerRows.length > 0) {
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("slug")
      .eq("id", customerRows[0]!.tenant_id)
      .single();
    if (tenantRow) {
      firstCustomerTenantSlug = tenantRow.slug;
    }
  }

  return {
    user,
    platformAdmin: adminResult.data
      ? { id: adminResult.data.id, role: adminResult.data.role }
      : null,
    tenantMemberships,
    tenantCustomerCount: customerCountResult.count ?? 0,
    firstCustomerTenantSlug,
  };
}
