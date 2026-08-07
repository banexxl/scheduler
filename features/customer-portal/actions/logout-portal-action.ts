"use server";

/**
 * Customer Portal Logout — Milestone 8.6.
 */

import { redirect } from "next/navigation";
import { clearPortalSession } from "../services/portal-session-cookies";

export async function logoutPortalAction(tenantSlug: string): Promise<void> {
  await clearPortalSession(tenantSlug);
  redirect(`/book/${tenantSlug}/portal`);
}
