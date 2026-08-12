import Stack from "@mui/material/Stack";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveBrandingConfig } from "@/features/branding/utils/validate-branding-config";
import PageHeader from "@/features/platform/components/page-header";
import BrandingEditorClient from "./client-page";

/**
 * Branding Settings — Milestone 14.4.
 *
 * Allows owners/admins to customize public booking appearance.
 */
export default async function BrandingSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  // Load current branding state
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("tenant_branding_settings")
    .select("draft_config, published_config, draft_version, published_version, published_at")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const row = data as {
    draft_config?: unknown;
    published_config?: unknown;
    draft_version?: number;
    published_version?: number;
    published_at?: string;
  } | null;

  const draftConfig = resolveBrandingConfig(row?.draft_config);
  const publishedConfig = resolveBrandingConfig(row?.published_config);
  const draftVersion = row?.draft_version ?? 1;
  const publishedVersion = row?.published_version ?? 0;
  const publishedAt = row?.published_at ?? null;
  const hasUnpublishedChanges = draftVersion > publishedVersion;

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Branding"
        description="Customize how your public booking pages look."
        breadcrumbs={[
          { label: "Settings", href: `/${tenantSlug}/settings` },
          { label: "Branding" },
        ]}
      />

      <BrandingEditorClient
        tenantSlug={tenantSlug}
        draftConfig={draftConfig}
        publishedConfig={publishedConfig}
        draftVersion={draftVersion}
        publishedVersion={publishedVersion}
        publishedAt={publishedAt}
        hasUnpublishedChanges={hasUnpublishedChanges}
      />
    </Stack>
  );
}
