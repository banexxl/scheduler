import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
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
import MetricCard from "@/features/platform/components/metric-card";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import type { CampaignStatus } from "@/features/campaigns/types/campaign";

/**
 * Campaign Dashboard — Milestone 15.7.
 */
export default async function CampaignsDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tenantSlug } = await params;
  const { page: pageParam } = await searchParams;
  const { tenant } = await requireTenantMember(tenantSlug);

  const supabase = createServiceRoleClient();
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));
  const pageSize = 20;
  const offset = (currentPage - 1) * pageSize;

  // Get status counts
  const statusCounts: Record<string, number> = { draft: 0, scheduled: 0, completed: 0, failed: 0 };
  for (const status of ["draft", "scheduled", "completed", "failed"] as const) {
    const { count } = await supabase
      .from("customer_campaigns" as never)
      .select("id" as never, { count: "exact", head: true })
      .eq("tenant_id" as never, tenant.id)
      .eq("status" as never, status);
    statusCounts[status] = count ?? 0;
  }

  // Get paginated campaigns
  const { data: campaigns, count: totalCount } = await supabase
    .from("customer_campaigns" as never)
    .select("id, name, channel, status, audience_name_snapshot, matched_count, eligible_count, sent_count, failed_count, scheduled_for, completed_at, created_at" as never, { count: "exact" })
    .eq("tenant_id" as never, tenant.id)
    .order("created_at" as never, { ascending: false })
    .range(offset, offset + pageSize - 1);

  type CampaignRow = {
    id: string; name: string; channel: string; status: CampaignStatus;
    audience_name_snapshot: string | null; matched_count: number; eligible_count: number;
    sent_count: number; failed_count: number; scheduled_for: string | null;
    completed_at: string | null; created_at: string;
  };

  const rows = (campaigns ?? []) as unknown as CampaignRow[];
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / pageSize));

  function getStatusColor(status: CampaignStatus): "default" | "success" | "warning" | "error" | "info" {
    switch (status) {
      case "draft": return "default";
      case "scheduled": return "info";
      case "processing": return "warning";
      case "completed": return "success";
      case "cancelled": return "default";
      case "failed": return "error";
    }
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Campaigns"
        description="Send marketing emails to customer segments."
        breadcrumbs={[{ label: "Campaigns" }]}
        action={
          <Button href={`/${tenantSlug}/campaigns/new`} variant="contained" size="small">
            New Campaign
          </Button>
        }
      />

      {/* Status Metrics */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Draft" value={statusCounts.draft ?? 0} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Scheduled" value={statusCounts.scheduled ?? 0} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Completed" value={statusCounts.completed ?? 0} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Failed" value={statusCounts.failed ?? 0} />
        </Grid>
      </Grid>

      {/* Campaign Table */}
      <SectionCard title="All Campaigns">
        {rows.length === 0 ? (
          <PlatformEmptyState
            title="No campaigns yet"
            description="Create your first marketing campaign to reach customer segments via email."
          />
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Campaign</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Audience</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Sent</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>{c.name}</TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem", color: "#8b8b9e" }}>
                      {c.audience_name_snapshot ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Chip label={c.status} size="small" color={getStatusColor(c.status)} />
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>
                      {c.sent_count > 0 ? `${c.sent_count}/${c.eligible_count}` : "—"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#5c5c72" }}>
                      {c.completed_at
                        ? new Date(c.completed_at).toLocaleDateString()
                        : c.scheduled_for
                          ? new Date(c.scheduled_for).toLocaleDateString()
                          : new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button href={`/${tenantSlug}/campaigns/${c.id}`} size="small" variant="text">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "center" }}>
                {currentPage > 1 && (
                  <Button href={`/${tenantSlug}/campaigns?page=${currentPage - 1}`} size="small" variant="text">
                    Previous
                  </Button>
                )}
                <Typography sx={{ fontSize: "0.8125rem", lineHeight: "32px", color: "#8b8b9e" }}>
                  Page {currentPage} of {totalPages}
                </Typography>
                {currentPage < totalPages && (
                  <Button href={`/${tenantSlug}/campaigns?page=${currentPage + 1}`} size="small" variant="text">
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
