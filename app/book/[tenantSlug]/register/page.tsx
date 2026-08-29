import { redirect } from "next/navigation";
import { resolvePublicTenant } from "@/features/public-booking/services/public-tenant-resolver";
import { getUser } from "@/lib/auth/get-user";
import CustomerRegisterForm from "@/features/customer-portal/components/customer-register-form";

/**
 * Tenant-scoped Customer Registration Page.
 *
 * /book/{tenantSlug}/register
 *
 * If already logged in, redirects to portal.
 */
export default async function CustomerRegisterPage({
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
    <CustomerRegisterForm
      tenantSlug={tenantSlug}
      tenantName={tenant.name}
    />
  );
}
