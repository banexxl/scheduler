import { notFound } from "next/navigation";
import Stack from "@mui/material/Stack";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getServices } from "@/features/services/services/get-services";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import { getBusinessResources } from "@/features/resources/services/get-business-resources";
import PageHeader from "@/features/platform/components/page-header";
import type { SegmentRuleGroup } from "@/features/segmentation/types/segment";
import SegmentEditClient from "./client-page";

/**
 * Edit Segment Page — Milestone 15.6.1.
 */
export default async function EditSegmentPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; segmentId: string }>;
}) {
  const { tenantSlug, segmentId } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const supabase = createServiceRoleClient();
  const { data: segment } = await supabase
    .from("customer_segments")
    .select("id, name, description, segment_type, rules")
    .eq("id", segmentId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!segment || segment.segment_type !== "custom") notFound();

  const [services, locations, resources] = await Promise.all([
    getServices(tenant.id),
    getBusinessLocations(tenant.id),
    getBusinessResources(tenant.id),
  ]);

  return (
    <Stack spacing={2}>
      <PageHeader
        title={`Edit: ${segment.name}`}
        description="Update segment rules and definition."
        breadcrumbs={[
          { label: "Customers", href: `/${tenantSlug}/customers` },
          { label: "Segments", href: `/${tenantSlug}/customers/segments` },
          { label: segment.name, href: `/${tenantSlug}/customers/segments/${segmentId}` },
          { label: "Edit" },
        ]}
      />

      <SegmentEditClient
        tenantSlug={tenantSlug}
        segmentId={segmentId}
        initialName={segment.name}
        initialDescription={segment.description ?? ""}
        initialRules={segment.rules as unknown as SegmentRuleGroup}
        services={services.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name }))}
        locations={locations.filter((l) => l.isActive).map((l) => ({ id: l.id, name: l.name }))}
        resources={resources.filter((r) => r.isActive).map((r) => ({ id: r.id, name: r.name }))}
      />
    </Stack>
  );
}
