import "server-only";

/**
 * Portal Session Guard — Supabase Auth based.
 *
 * Validates the Supabase Auth session and resolves tenant context.
 * Redirects to portal login if no session or no tenant match.
 */

import { redirect } from "next/navigation";
import { resolvePublicTenant } from "@/features/public-booking/services/public-tenant-resolver";
import { getPortalSessionFromCookie } from "./portal-session-cookies";
import type { PortalSessionContext } from "./portal-session-cookies";

export type PortalPageContext = {
  session: PortalSessionContext;
  tenant: {
    id: string;
    name: string;
    slug: string;
    defaultTimeZone: string;
  };
};

/**
 * Requires an active Supabase Auth session with a matching tenant_customers
 * record. Redirects to /book/{tenantSlug}/portal if not authenticated.
 */
export async function requirePortalSession(
  tenantSlug: string
): Promise<PortalPageContext> {
  const tenant = await resolvePublicTenant(tenantSlug);
  if (!tenant) redirect(`/book/${tenantSlug}`);

  const session = await getPortalSessionFromCookie(tenantSlug);
  if (!session || session.tenantId !== tenant.id) {
    redirect(`/book/${tenantSlug}/portal`);
  }

  return {
    session,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenantSlug,
      defaultTimeZone: tenant.defaultTimeZone,
    },
  };
}
