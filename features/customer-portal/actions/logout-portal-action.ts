"use server";

/**
 * Customer Portal Logout — Supabase Auth based.
 */

import { redirect } from "next/navigation";
import { clearPortalSession } from "../services/portal-session-cookies";

export async function logoutPortalAction(tenantSlug: string): Promise<void> {
  await clearPortalSession(tenantSlug);
  redirect(`/book/${tenantSlug}/portal`);
}
