import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import BusinessShell from "@/features/business/components/business-shell";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { user, tenant, membership } = await requireTenantMember(tenantSlug);

  return (
    <BusinessShell
      tenantName={tenant.name}
      tenantSlug={tenantSlug}
      userEmail={user.email ?? ""}
      role={membership.role}
    >
      {children}
    </BusinessShell>
  );
}
