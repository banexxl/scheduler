import Stack from "@mui/material/Stack";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveSiteConfig } from "@/features/public-site/utils/validate-site-config";
import PageHeader from "@/features/platform/components/page-header";
import PublicSiteEditorClient from "./client-page";

/**
 * Public Site Settings — Milestone 15.13.
 *
 * Allows owners/admins to configure the public website:
 * - Hero section
 * - Section ordering/visibility
 * - About content
 * - Featured services
 * - FAQ entries
 * - Social links
 * - SEO metadata
 * - Draft/publish workflow
 */
export default async function PublicSiteSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  // Load current site config state
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("tenant_public_site_settings" as never)
    .select("draft_config, published_config, draft_version, published_version, published_at" as never)
    .eq("tenant_id" as never, tenant.id)
    .maybeSingle();

  const row = data as {
    draft_config?: unknown;
    published_config?: unknown;
    draft_version?: number;
    published_version?: number;
    published_at?: string;
  } | null;

  const draftConfig = resolveSiteConfig(row?.draft_config);
  const publishedVersion = row?.published_version ?? 0;
  const draftVersion = row?.draft_version ?? 1;
  const publishedAt = row?.published_at ?? null;
  const hasUnpublishedChanges = draftVersion > publishedVersion;

  // Load services for featured selection
  const { data: servicesData } = await supabase
    .from("services")
    .select("id, name, slug")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(100);

  const availableServices = ((servicesData ?? []) as unknown as Array<{ id: string; name: string; slug: string }>)
    .map(s => ({ id: s.id, name: s.name }));

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Public Website"
        description="Configure your public business website and homepage sections."
        breadcrumbs={[
          { label: "Settings", href: `/${tenantSlug}/settings` },
          { label: "Public Website" },
        ]}
      />

      <PublicSiteEditorClient
        tenantSlug={tenantSlug}
        draftConfig={draftConfig}
        draftVersion={draftVersion}
        publishedVersion={publishedVersion}
        publishedAt={publishedAt}
        hasUnpublishedChanges={hasUnpublishedChanges}
        availableServices={availableServices}
      />
    </Stack>
  );
}
