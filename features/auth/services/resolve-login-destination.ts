import "server-only";
import type { User } from "@supabase/supabase-js";
import { resolveUserIdentity } from "./resolve-user-identity";

/**
 * Resolves the post-login destination for an authenticated user.
 *
 * Precedence:
 * 1. Active platform administrator → /platform/dashboard
 * 2. Active tenant member → /app/[tenantSlug]/dashboard
 * 3. No platform role and no tenant membership → /account
 *
 * One owner = one business. The first accessible tenant membership
 * determines the redirect. Multi-tenant selection is not supported.
 */
export async function resolveLoginDestination(user: User): Promise<string> {
  const identity = await resolveUserIdentity(user);

  // 1. Platform admin
  if (identity.platformAdmin) {
    return "/platform/dashboard";
  }

  // 2. Tenant member — redirect to their business dashboard
  const accessible = identity.tenantMemberships.filter(
    (m) => m.tenantStatus === "active"
  );

  if (accessible.length > 0) {
    return `/app/${accessible[0]!.tenantSlug}/dashboard`;
  }

  // 3. No platform role, no tenant membership
  return "/account";
}
