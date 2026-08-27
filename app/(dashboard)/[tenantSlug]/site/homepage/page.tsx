import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getHomepageContent } from "@/features/homepage-builder/actions/homepage-actions";
import PageHeader from "@/features/platform/components/page-header";
import HomepageBuilderClient from "./client-page";

/**
 * Homepage Builder — Milestone 16.4.
 *
 * Allows owners/admins to customize the public portal homepage.
 */
export default async function HomepageBuilderPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const result = await getHomepageContent(tenantSlug);

  if (!result.success) {
    return <Alert severity="error">Unable to load homepage content.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Homepage"
        description="Customize what customers see on your public booking page."
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Homepage" },
        ]}
      />

      <HomepageBuilderClient
        tenantSlug={tenantSlug}
        initialData={result.data}
      />
    </Stack>
  );
}
