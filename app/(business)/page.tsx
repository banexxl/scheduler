import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getUserTenants } from "@/lib/tenants/get-user-tenants";

/**
 * Authenticated tenant landing page.
 *
 * - If the user belongs to a tenant → redirect to their business dashboard
 * - If they do not belong to any tenant → redirect to /account
 *
 * No workspace selector is shown. One owner = one business.
 */
export default async function AppLandingPage() {
  const user = await requireUser();
  const tenants = await getUserTenants(user);

  const accessible = tenants.filter((t) => t.tenantStatus === "active");

  if (accessible.length > 0) {
    redirect(`/app/${accessible[0]!.tenantSlug}/dashboard`);
  }

  redirect("/account");
}
