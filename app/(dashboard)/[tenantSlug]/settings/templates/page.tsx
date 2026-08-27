import Stack from "@mui/material/Stack";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import {
  getAvailableTemplates,
  getActiveTemplate,
} from "@/features/templates/actions/template-actions";
import PageHeader from "@/features/platform/components/page-header";
import TemplatesClientPage from "./client-page";

/**
 * Templates Settings — Milestone 16.2.
 *
 * Allows owners/admins to browse and activate booking portal templates.
 */
export default async function TemplatesSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const [templates, activeTemplateId] = await Promise.all([
    getAvailableTemplates(),
    getActiveTemplate(tenant.id),
  ]);

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Templates"
        description="Choose a layout for your public booking page."
        breadcrumbs={[
          { label: "Settings", href: `/${tenantSlug}/settings` },
          { label: "Templates" },
        ]}
      />

      <TemplatesClientPage
        tenantSlug={tenantSlug}
        templates={templates}
        activeTemplateId={activeTemplateId}
      />
    </Stack>
  );
}
