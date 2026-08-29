import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import { BUILT_IN_SEGMENTS } from "@/features/segmentation/services/built-in-segments";
import { getBuiltInSegmentCounts } from "@/features/segmentation/services/evaluate-segment";

/**
 * Customer Segments Dashboard — Milestone 15.6.
 */
export default async function SegmentsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantMember(tenantSlug);

  const supabase = createServiceRoleClient();

  // Load built-in counts
  const counts = await getBuiltInSegmentCounts(tenant.id);

  // Load saved segments
  const { data: saved } = await supabase
    .from("customer_segments")
    .select("id, name, description, is_active, created_at")
    .eq("tenant_id", tenant.id)
    .eq("segment_type", "custom")
    .order("created_at", { ascending: false });

  const savedSegments = (saved ?? []) as Array<{ id: string; name: string; description: string | null; is_active: boolean; created_at: string }>;

  // Key built-in segments to highlight
  const highlights = BUILT_IN_SEGMENTS.filter((s) =>
    ["all_customers", "returning_customers", "inactive_customers", "upcoming_appointments"].includes(s.key)
  );

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Customer Segments"
        description="Understand, filter, and group customers by behavior."
        breadcrumbs={[
          { label: "Customers", href: `/${tenantSlug}/customers` },
          { label: "Segments" },
        ]}
        action={
          <Button href={`/${tenantSlug}/customers/segments/new`} variant="contained" size="small">
            Create Segment
          </Button>
        }
      />

      {/* Key metrics */}
      <Grid container spacing={2}>
        {highlights.map((seg) => (
          <Grid key={seg.key} size={{ xs: 6, sm: 3 }}>
            <MetricCard
              label={seg.name}
              value={counts[seg.key] ?? 0}
              secondary={seg.description}
            />
          </Grid>
        ))}
      </Grid>

      {/* Built-in segments */}
      <SectionCard title="Built-In Segments">
        <Grid container spacing={1.5}>
          {BUILT_IN_SEGMENTS.map((seg) => (
            <Grid key={seg.key} size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 1.5, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500 }}>{seg.name}</Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "#5c5c72" }}>{seg.description}</Typography>
                </Box>
                <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#8B5CF6" }}>
                  {counts[seg.key] ?? 0}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      {/* Saved segments */}
      <SectionCard
        title="Saved Segments"
        action={
          <Button href={`/${tenantSlug}/customers/segments/new`} variant="text" size="small">
            + New
          </Button>
        }
      >
        {savedSegments.length === 0 ? (
          <PlatformEmptyState
            title="No saved segments"
            description="Create custom segments to group customers by behavior, visits, or purchases."
          />
        ) : (
          <Stack spacing={1}>
            {savedSegments.map((seg) => (
              <Box
                key={seg.id}
                sx={{ p: 1.5, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <Box>
                  <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500 }}>{seg.name}</Typography>
                  {seg.description && (
                    <Typography sx={{ fontSize: "0.7rem", color: "#5c5c72" }}>{seg.description}</Typography>
                  )}
                </Box>
                <Button href={`/${tenantSlug}/customers/segments/${seg.id}`} size="small" variant="text">
                  View
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}
