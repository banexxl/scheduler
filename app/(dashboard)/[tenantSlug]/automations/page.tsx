import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
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
import type { AutomationStatus } from "@/features/automations/types/automation";

/**
 * Automation Dashboard — Milestone 15.8.
 */
export default async function AutomationsDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantMember(tenantSlug);

  const supabase = createServiceRoleClient();

  // Status counts
  const statusCounts: Record<string, number> = { draft: 0, active: 0, paused: 0, archived: 0 };
  for (const status of ["draft", "active", "paused", "archived"] as const) {
    const { count } = await supabase
      .from("marketing_automations" as never)
      .select("id" as never, { count: "exact", head: true })
      .eq("tenant_id" as never, tenant.id)
      .eq("status" as never, status);
    statusCounts[status] = count ?? 0;
  }

  // Active enrollments count
  const { count: activeEnrollments } = await supabase
    .from("marketing_automation_enrollments" as never)
    .select("id" as never, { count: "exact", head: true })
    .eq("tenant_id" as never, tenant.id)
    .in("status" as never, ["active", "waiting"]);

  // Load automations
  const { data: automations } = await supabase
    .from("marketing_automations" as never)
    .select("id, name, trigger_type, status, published_at, updated_at" as never)
    .eq("tenant_id" as never, tenant.id)
    .neq("status" as never, "archived")
    .order("updated_at" as never, { ascending: false })
    .limit(50);

  type AutomationRow = {
    id: string; name: string; trigger_type: string; status: AutomationStatus;
    published_at: string | null; updated_at: string;
  };

  const rows = (automations ?? []) as unknown as AutomationRow[];

  function getStatusColor(status: AutomationStatus): "default" | "success" | "warning" | "error" | "info" {
    switch (status) {
      case "draft": return "default";
      case "active": return "success";
      case "paused": return "warning";
      case "archived": return "default";
    }
  }

  function formatTrigger(type: string): string {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Automations"
        description="Automated customer journeys triggered by behavior."
        breadcrumbs={[{ label: "Automations" }]}
        action={
          <Button href={`/${tenantSlug}/automations/new`} variant="contained" size="small">
            New Automation
          </Button>
        }
      />

      {/* Metrics */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Active" value={statusCounts.active ?? 0} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Draft" value={statusCounts.draft ?? 0} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Paused" value={statusCounts.paused ?? 0} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Running Journeys" value={activeEnrollments ?? 0} />
        </Grid>
      </Grid>

      {/* Table */}
      <SectionCard title="All Automations">
        {rows.length === 0 ? (
          <PlatformEmptyState
            title="No automations yet"
            description="Create automated customer journeys triggered by appointments, referrals, or inactivity."
          />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Automation</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Trigger</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Updated</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{a.name}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem", color: "#8b8b9e" }}>{formatTrigger(a.trigger_type)}</TableCell>
                  <TableCell><Chip label={a.status} size="small" color={getStatusColor(a.status)} /></TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", color: "#5c5c72" }}>{new Date(a.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button href={`/${tenantSlug}/automations/${a.id}`} size="small" variant="text">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </Stack>
  );
}
