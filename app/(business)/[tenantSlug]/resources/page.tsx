import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessResources } from "@/features/resources/services/get-business-resources";
import ResourceList from "@/features/resources/components/resource-list";
import PageHeader from "@/features/platform/components/page-header";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function ResourcesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  let resources;
  try {
    resources = await getBusinessResources(tenant.id);
  } catch {
    return <Alert severity="error">Unable to load resources.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Resources"
        description={`${resources.length} resource${resources.length !== 1 ? "s" : ""} — staff, rooms, and equipment`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Resources" },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              href={`/${tenantSlug}/resources/types`}
              variant="text"
              size="small"
            >
              Manage Types
            </Button>
            {canEdit && (
              <Button
                href={`/${tenantSlug}/resources/new`}
                variant="contained"
                size="small"
              >
                Add Resource
              </Button>
            )}
          </Stack>
        }
      />

      <ResourceList resources={resources} tenantSlug={tenantSlug} canEdit={canEdit} />
    </Stack>
  );
}
