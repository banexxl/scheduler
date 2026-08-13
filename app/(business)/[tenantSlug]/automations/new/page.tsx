import Stack from "@mui/material/Stack";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import PageHeader from "@/features/platform/components/page-header";
import AutomationBuilderClient from "./client-page";

/**
 * New Automation Page — Milestone 15.8.
 */
export default async function NewAutomationPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  await requireTenantRole(tenantSlug, ["owner", "admin", "manager"]);

  return (
    <Stack spacing={2}>
      <PageHeader
        title="New Automation"
        description="Create an automated customer journey."
        breadcrumbs={[
          { label: "Automations", href: `/${tenantSlug}/automations` },
          { label: "New" },
        ]}
      />
      <AutomationBuilderClient tenantSlug={tenantSlug} />
    </Stack>
  );
}
