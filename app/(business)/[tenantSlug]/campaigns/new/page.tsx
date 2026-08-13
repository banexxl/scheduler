import Stack from "@mui/material/Stack";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { BUILT_IN_SEGMENTS } from "@/features/segmentation/services/built-in-segments";
import PageHeader from "@/features/platform/components/page-header";
import CampaignBuilderClient from "./client-page";

/**
 * New Campaign Page — Milestone 15.7.
 */
export default async function NewCampaignPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin", "manager"]);

  // Load saved segments
  const supabase = createServiceRoleClient();
  const { data: savedSegments } = await supabase
    .from("customer_segments")
    .select("id, name")
    .eq("tenant_id", tenant.id)
    .eq("segment_type", "custom")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const segments = (savedSegments ?? []) as Array<{ id: string; name: string }>;

  // Built-in segment options
  const builtInOptions = BUILT_IN_SEGMENTS.map((s) => ({ key: s.key, name: s.name }));

  return (
    <Stack spacing={2}>
      <PageHeader
        title="New Campaign"
        description="Create and send a marketing email to a customer segment."
        breadcrumbs={[
          { label: "Campaigns", href: `/${tenantSlug}/campaigns` },
          { label: "New" },
        ]}
      />
      <CampaignBuilderClient
        tenantSlug={tenantSlug}
        savedSegments={segments}
        builtInSegments={builtInOptions}
      />
    </Stack>
  );
}
