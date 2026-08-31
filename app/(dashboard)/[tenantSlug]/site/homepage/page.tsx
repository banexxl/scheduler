import { redirect } from "next/navigation";

/**
 * Redirect — Homepage builder merged into /settings/public-site.
 */
export default async function HomepageRedirectPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  redirect(`/${tenantSlug}/settings/public-site`);
}
