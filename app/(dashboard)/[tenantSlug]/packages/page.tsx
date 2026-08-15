import Stack from "@mui/material/Stack";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getPackages } from "@/features/packages/services/package-queries";
import PageHeader from "@/features/platform/components/page-header";
import PackagesClientPage from "./client-page";

export default async function PackagesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  const packages = await getPackages(tenant.id);

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Packages"
        description={`${packages.length} package${packages.length !== 1 ? "s" : ""} — credit bundles for customers`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Packages" },
        ]}
      />

      <PackagesClientPage
        tenantSlug={tenantSlug}
        packages={packages}
        canManage={["owner", "admin"].includes(membership.role)}
      />
    </Stack>
  );
}
