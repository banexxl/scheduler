import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import SectionCard from "@/features/platform/components/section-card";
import { getProcessorHealthStatus, getBacklogSummary } from "@/features/platform/services/processor-health-service";
import type { ProcessorHealthStatus } from "@/features/platform/services/processor-health-service";

/**
 * Platform Operations Dashboard — Milestone 15.11.
 */
export default async function OperationsPage() {
  const processors = await getProcessorHealthStatus();
  const backlog = await getBacklogSummary();

  function getStatusColor(status: ProcessorHealthStatus): "success" | "warning" | "error" | "default" {
    switch (status) {
      case "healthy": return "success";
      case "stale": return "warning";
      case "failing": return "error";
      default: return "default";
    }
  }

  const criticalCount = processors.filter((p) => p.status === "failing").length;
  const staleCount = processors.filter((p) => p.status === "stale").length;
  const healthyCount = processors.filter((p) => p.status === "healthy").length;

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Operations"
        description="Platform processor health and operational backlog."
        breadcrumbs={[
          { label: "Platform", href: "/platform" },
          { label: "Operations" },
        ]}
      />

      {/* Summary */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Healthy" value={healthyCount} /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Stale" value={staleCount} /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Failing" value={criticalCount} /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><MetricCard label="Total Processors" value={processors.length} /></Grid>
      </Grid>

      {/* Backlog */}
      <SectionCard title="Operational Backlog">
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: backlog.pendingNotifications > 0 ? "#ca8a04" : "#16a34a" }}>{backlog.pendingNotifications}</Typography>
              <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Pending Notifications</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: backlog.scheduledCampaignsPastDue > 0 ? "#dc2626" : "#16a34a" }}>{backlog.scheduledCampaignsPastDue}</Typography>
              <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Campaigns Past Due</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: backlog.failedWebhooks > 0 ? "#dc2626" : "#16a34a" }}>{backlog.failedWebhooks}</Typography>
              <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Failed Webhooks</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 700 }}>{backlog.dueAutomationEnrollments}</Typography>
              <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Due Automations</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 700 }}>{backlog.pendingImportRows}</Typography>
              <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Pending Imports</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: backlog.stalePaymentIntents > 0 ? "#ca8a04" : "#16a34a" }}>{backlog.stalePaymentIntents}</Typography>
              <Typography sx={{ fontSize: "0.6875rem", color: "#6b7280" }}>Stale Payments</Typography>
            </Box>
          </Grid>
        </Grid>
      </SectionCard>

      {/* Processor Table */}
      <SectionCard title="Processor Health">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Processor</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Last Success</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Duration</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Processed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {processors.map((p) => (
              <TableRow key={p.name} hover>
                <TableCell sx={{ fontSize: "0.8125rem" }}>{p.label}</TableCell>
                <TableCell><Chip label={p.status} size="small" color={getStatusColor(p.status)} /></TableCell>
                <TableCell sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {p.lastSuccessAt ? new Date(p.lastSuccessAt).toLocaleString() : "Never"}
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{p.lastDurationMs ? `${p.lastDurationMs}ms` : "—"}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{p.lastProcessed ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </Stack>
  );
}
