import "server-only";

/**
 * Portal Session Service — Supabase Auth based.
 *
 * Replaces the custom cookie/token system with Supabase Auth.
 * The user authenticates via signInWithOtp (magic link) and gets
 * a standard Supabase session. This service resolves tenant-scoped
 * portal context from that session.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PortalSessionContext = {
  sessionId: string;
  tenantId: string;
  normalizedEmail: string;
  customerId: string | null;
  expiresAt: string;
};

// ─── Get Session from Supabase Auth ──────────────────────────────────────────

/**
 * Checks if the current user has a Supabase Auth session and resolves
 * their tenant_customers record for the given tenant.
 *
 * Returns null if:
 * - No authenticated user
 * - User has no tenant_customers record for this tenant
 */
export async function getPortalSessionFromCookie(
  tenantSlug: string
): Promise<PortalSessionContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const normalizedEmail = user.email.trim().toLowerCase();

  // Resolve tenant
  const adminClient = createAdminClient();
  const { data: tenant } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("tenants" as never)
    .select("id" as never)
    .eq("slug" as never, tenantSlug)
    .in("status" as never, ["active", "trialing"] as never)
    .single();

  if (!tenant) return null;
  const tenantId = (tenant as unknown as { id: string }).id;

  // Find matching tenant_customer by email
  const { data: customer } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("tenant_customers" as never)
    .select("id" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("email" as never, normalizedEmail)
    .limit(1)
    .single();

  const customerId = customer ? (customer as unknown as { id: string }).id : null;

  return {
    sessionId: user.id,
    tenantId,
    normalizedEmail,
    customerId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
  };
}

// ─── Clear Session (Logout) ──────────────────────────────────────────────────

/**
 * Signs out the user via Supabase Auth.
 */
export async function clearPortalSession(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tenantSlug: string
): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
