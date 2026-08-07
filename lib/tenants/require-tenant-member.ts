import "server-only";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { getTenantBySlug, type TenantRow } from "./get-tenant-by-slug";
import type { User } from "@supabase/supabase-js";

export type TenantMemberContext = {
  user: User;
  tenant: TenantRow;
  membership: {
    id: string;
    role: string;
  };
};

/**
 * Requires an authenticated user who is an active member of the given tenant.
 *
 * 1. Calls requireUser()
 * 2. Normalizes and validates the slug
 * 3. Loads the tenant
 * 4. Verifies an active membership for the current user
 * 5. Ensures the tenant status permits backoffice access
 * 6. Returns the user, tenant, and membership
 * 7. Calls notFound() when unauthorized (does not reveal if tenant exists)
 */
export async function requireTenantMember(
  tenantSlug: string
): Promise<TenantMemberContext> {
  const user = await requireUser();
  const tenant = await getTenantBySlug(tenantSlug);

  const allowedTenantStatuses = new Set(["active", "trialing"]);

  if (!tenant || !allowedTenantStatuses.has(tenant.status)) {
    notFound();
  }

  try {
    const serviceRoleClient = createServiceRoleClient();
    const { data: membership, error } = await serviceRoleClient
      .from("tenant_members")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .single();

    if (!error && membership) {
      return { user, tenant, membership };
    }
  } catch {
    // Fall through to notFound below.
  }

  notFound();
}
