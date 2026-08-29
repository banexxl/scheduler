import { redirect } from "next/navigation";

/**
 * Portal Session Token Page — Legacy redirect.
 *
 * The custom magic-link token system has been replaced by Supabase Auth.
 * Old magic links pointing here will redirect to the portal login.
 */
export default async function PortalSessionTokenPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; token: string }>;
}) {
  const { tenantSlug } = await params;
  redirect(`/book/${tenantSlug}/portal`);
}
