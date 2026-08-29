import { redirect } from "next/navigation";
import { resolvePublicTenant } from "@/features/public-booking/services/public-tenant-resolver";
import { getUser } from "@/lib/auth/get-user";
import CustomerLoginForm from "@/features/customer-portal/components/customer-login-form";

/**
 * Tenant-scoped Customer Login Page.
 *
 * /book/{tenantSlug}/login
 *
 * If already logged in, redirects to portal.
 */
export default async function CustomerLoginPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const tenant = await resolvePublicTenant(tenantSlug);
  if (!tenant) redirect(`/book/${tenantSlug}`);

  const user = await getUser();
  if (user) {
    redirect(`/book/${tenantSlug}/portal`);
  }

  return (
    <CustomerLoginForm
      tenantSlug={tenantSlug}
      tenantName={tenant.name}
    />
  );
}
