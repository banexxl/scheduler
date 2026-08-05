import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type UserTenantMembership = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: string;
  role: string;
};

/**
 * Returns all active tenant memberships for a user.
 * Does not assume one user belongs to only one tenant.
 */
export async function getUserTenants(
  user: User
): Promise<UserTenantMembership[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tenant_members")
    .select("id, role, tenant_id, tenants(id, name, slug, status)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!data) return [];

  return data
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
        tenantStatus: tenant.status,
        role: m.role,
      };
    });
}
