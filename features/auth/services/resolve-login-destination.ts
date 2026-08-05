import "server-only";
import type { User } from "@supabase/supabase-js";
import { resolveUserIdentity } from "./resolve-user-identity";

/**
 * Resolves the post-login destination for an authenticated user.
 *
 * Precedence:
 * 1. Active platform administrator → /platform/dashboard
 * 2. Exactly one accessible active tenant membership → /app/[slug]/dashboard
 * 3. More than one accessible tenant membership → /app (workspace selector)
 * 4. No platform-admin and no tenant membership → /account
 *
 * Only tenant memberships where both the member is active AND
 * the tenant status is "active" are considered accessible.
 */
export async function resolveLoginDestination(user: User): Promise<string> {
  const identity = await resolveUserIdentity(user);

  // 1. Platform admin
  if (identity.platformAdmin) {
    return "/platform/dashboard";
  }

  // Filter to accessible tenants (active status)
  const accessible = identity.tenantMemberships.filter(
    (m) => m.tenantStatus === "active"
  );

  // 2. Exactly one accessible tenant
  if (accessible.length === 1) {
    return `/app/${accessible[0]!.tenantSlug}/dashboard`;
  }

  // 3. Multiple accessible tenants
  if (accessible.length > 1) {
    return "/app";
  }

  // 4. No platform role, no tenant membership
  return "/account";
}
