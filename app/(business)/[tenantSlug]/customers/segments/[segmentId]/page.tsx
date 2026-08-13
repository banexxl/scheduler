import { notFound } from "next/navigation";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import { getSegmentCustomers, getSegmentCustomerCount } from "@/features/segmentation/services/evaluate-segment";
import { formatRuleSummary } from "@/features/segmentation/utils/validate-segment-rules";
import type { SegmentRuleGroup } from "@/features/segmentation/types/segment";
import SegmentDeleteButton from "./segment-delete-button";

/**
 * Segment Detail Page — Milestone 15.6.1.
 *
 * Shows segment info, rule summary, live count, and paginated customer members.
 */
export default async function SegmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; segmentId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tenantSlug, segmentId } = await params;
  const { page: pageParam } = await searchParams;
  const { tenant } = await requireTenantMember(tenantSlug);

  const supabase = createServiceRoleClient();
  const { data: segment } = await supabase
    .from("customer_segments")
    .select("id, name, description, segment_type, rules, is_active, created_at, updated_at")
    .eq("id", segmentId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!segment) notFound();

  const rules = segment.rules as unknown as SegmentRuleGroup;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));
  const pageSize = 25;
  const offset = (currentPage - 1) * pageSize;

  // Evaluate
  const [countResult, customersResult] = await Promise.all([
    getSegmentCustomerCount(tenant.id, rules),
    getSegmentCustomers(tenant.id, rules, pageSize, offset),
  ]);

  const totalCount = countResult.count;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const ruleSummary = formatRuleSummary(rules);

  return (
    <Stack spacing={2}>
      <PageHeader
        title={segment.name}
        description={segment.description ?? undefined}
        breadcrumbs={[
          { label: "Customers", href: `/${tenantSlug}/customers` },
          { label: "Segments", href: `/${tenantSlug}/customers/segments` },
          { label: segment.name },
        ]}
        status={
          <Chip
            label={segment.is_active ? "Active" : "Inactive"}
            size="small"
            color={segment.is_active ? "success" : "default"}
          />
        }
        action={
          segment.segment_type === "custom" ? (
            <Stack direction="row" spacing={1}>
              <Button href={`/${tenantSlug}/customers/segments/${segmentId}/edit`} variant="contained" size="small">
                Edit
              </Button>
              <SegmentDeleteButton tenantSlug={tenantSlug} segmentId={segmentId} />
            </Stack>
          ) : undefined
        }
      />

      {/* Metrics Row */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 2, bgcolor: "#f0f9ff", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#2563eb" }}>{totalCount}</Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>Matching Customers</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 2, bgcolor: "#f0fdf4", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#16a34a" }}>
              {segment.segment_type === "custom" ? "Custom" : "Built-in"}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>Type</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 2, bgcolor: "#fefce8", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#ca8a04" }}>
              {rules.rules?.length ?? 0}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>Rules</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 2, bgcolor: "#fdf4ff", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "#9333ea" }}>
              {new Date(segment.created_at).toLocaleDateString()}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>Created</Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Rule Summary */}
      <SectionCard title="Rule Definition">
        <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 1, fontFamily: "monospace", fontSize: "0.8125rem", color: "#374151" }}>
          {ruleSummary}
        </Box>
      </SectionCard>

      {/* Customer List */}
      <SectionCard title={`Customers (${totalCount})`}>
        {customersResult.customers.length === 0 ? (
          <PlatformEmptyState title="No matching customers" description="This segment has no matching customers yet." />
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customersResult.customers.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>
                      <Typography
                        component="a"
                        href={`/${tenantSlug}/customers/${c.id}`}
                        sx={{ color: "#2563eb", textDecoration: "none", fontSize: "0.8125rem", "&:hover": { textDecoration: "underline" } }}
                      >
                        {c.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem", color: "#6b7280" }}>{c.email ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "center" }}>
                {currentPage > 1 && (
                  <Button href={`/${tenantSlug}/customers/segments/${segmentId}?page=${currentPage - 1}`} size="small" variant="text">
                    Previous
                  </Button>
                )}
                <Typography sx={{ fontSize: "0.8125rem", lineHeight: "32px", color: "#6b7280" }}>
                  Page {currentPage} of {totalPages}
                </Typography>
                {currentPage < totalPages && (
                  <Button href={`/${tenantSlug}/customers/segments/${segmentId}?page=${currentPage + 1}`} size="small" variant="text">
                    Next
                  </Button>
                )}
              </Stack>
            )}
          </>
        )}
      </SectionCard>
    </Stack>
  );
}
