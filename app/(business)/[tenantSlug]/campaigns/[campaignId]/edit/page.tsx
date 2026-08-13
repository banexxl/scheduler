import { notFound } from "next/navigation";
import Stack from "@mui/material/Stack";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { BUILT_IN_SEGMENTS } from "@/features/segmentation/services/built-in-segments";
import PageHeader from "@/features/platform/components/page-header";
import CampaignEditClient from "./client-page";

/**
 * Edit Campaign Page — Milestone 15.7.
 */
export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; campaignId: string }>;
}) {
  const { tenantSlug, campaignId } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin", "manager"]);

  const supabase = createServiceRoleClient();

  // Load campaign
  const { data: campaign } = await supabase
    .from("customer_campaigns" as never)
    .select("id, name, subject, content, cta_text, cta_url, segment_id, audience_source, status" as never)
    .eq("id" as never, campaignId)
    .eq("tenant_id" as never, tenant.id)
    .single();

  if (!campaign) notFound();

  const c = campaign as unknown as {
    id: string; name: string; subject: string | null; content: string | null;
    cta_text: string | null; cta_url: string | null; segment_id: string | null;
    audience_source: string; status: string;
  };

  if (c.status !== "draft") notFound();

  // Load saved segments
  const { data: savedSegments } = await supabase
    .from("customer_segments")
    .select("id, name")
    .eq("tenant_id", tenant.id)
    .eq("segment_type", "custom")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const segments = (savedSegments ?? []) as Array<{ id: string; name: string }>;
  const builtInOptions = BUILT_IN_SEGMENTS.map((s) => ({ key: s.key, name: s.name }));

  return (
    <Stack spacing={2}>
      <PageHeader
        title={`Edit: ${c.name}`}
        breadcrumbs={[
          { label: "Campaigns", href: `/${tenantSlug}/campaigns` },
          { label: c.name, href: `/${tenantSlug}/campaigns/${campaignId}` },
          { label: "Edit" },
        ]}
      />
      <CampaignEditClient
        tenantSlug={tenantSlug}
        campaignId={campaignId}
        initialName={c.name}
        initialSubject={c.subject ?? ""}
        initialContent={c.content ?? ""}
        initialCtaText={c.cta_text ?? ""}
        initialCtaUrl={c.cta_url ?? ""}
        initialSegmentId={c.segment_id ?? ""}
        initialAudienceSource={c.audience_source as "segment" | "built_in_segment"}
        savedSegments={segments}
        builtInSegments={builtInOptions}
      />
    </Stack>
  );
}
