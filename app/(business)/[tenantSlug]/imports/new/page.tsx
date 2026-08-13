import Stack from "@mui/material/Stack";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import PageHeader from "@/features/platform/components/page-header";
import ImportWizardClient from "./client-page";

/**
 * New Import Page — Milestone 15.10.
 */
export default async function NewImportPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  await requireTenantRole(tenantSlug, ["owner", "admin", "manager"]);

  return (
    <Stack spacing={2}>
      <PageHeader
        title="New Import"
        description="Upload and import data from a CSV file."
        breadcrumbs={[
          { label: "Imports", href: `/${tenantSlug}/imports` },
          { label: "New" },
        ]}
      />
      <ImportWizardClient tenantSlug={tenantSlug} />
    </Stack>
  );
}
