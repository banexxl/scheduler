import "server-only";
import type { User } from "@supabase/supabase-js";
import {
  resolveUserIdentity,
  type ResolvedUserIdentity,
} from "./resolve-user-identity";

/**
 * Resolves the post-login destination for an authenticated user.
 *
 * Precedence:
 * 1. Active platform administrator → /platform/dashboard
 * 2. Active tenant member → /${tenantSlug}/dashboard
 * 3. Customer-only user (has tenant_customers but no membership) → /account
 * 4. New user (no platform, tenant, or customer relationship) → /create-business
 *
 * One owner = one business. When multiple tenant memberships exist,
 * the first one ordered by tenant name ascending is used.
 * Multi-tenant selection is not supported.
 */
export async function resolveLoginDestination(user: User): Promise<string> {
  const identity = await resolveUserIdentity(user);
  return resolveDestinationFromIdentity(identity);
}

/**
 * Pure destination logic extracted so guards and callbacks can reuse it
 * without re-fetching identity when they already have it.
 */
export function resolveDestinationFromIdentity(
  identity: ResolvedUserIdentity
): string {
  // 1. Platform admin
  if (identity.platformAdmin) {
    return "/platform/dashboard";
  }

  // 2. Tenant member — redirect to their business dashboard
  // Use deterministic ordering: tenant name ascending
  const accessible = identity.tenantMemberships
    .filter((m) => m.tenantStatus === "active")
    .sort((a, b) => a.tenantName.localeCompare(b.tenantName));

  if (accessible.length > 0) {
    return `/${accessible[0]!.tenantSlug}/dashboard`;
  }

  // 3. Customer-only user — has customer relationships but no membership
  if (identity.tenantCustomerCount > 0) {
    return "/customer";
  }

  // 4. Brand-new user — no relationships at all
  return "/create-business";
}
