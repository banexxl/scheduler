import { notFound } from "next/navigation";
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
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import type { AutomationStatus, EnrollmentStatus } from "@/features/automations/types/automation";
import AutomationActionsClient from "./automation-actions-client";

/**
 * Automation Detail Page — Milestone 15.8.
 */
export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; automationId: string }>;
}) {
  const { tenantSlug, automationId } = await params;
  const { tenant } = await requireTenantMember(tenantSlug);

  const supabase = createServiceRoleClient();

  // Load automation
  const { data: automation } = await supabase
    .from("marketing_automations" as never)
    .select("*" as never)
    .eq("id" as never, automationId)
    .eq("tenant_id" as never, tenant.id)
    .single();

  if (!automation) notFound();

  type AutoRow = {
    id: string; name: string; description: string | null; trigger_type: string;
    trigger_config: Record<string, unknown>; status: AutomationStatus;
    re_enrollment_policy: string; timezone: string; current_version_id: string | null;
    published_at: string | null; paused_at: string | null; created_at: string;
  };

  const a = automation as unknown as AutoRow;

  // Load steps (from current version if published)
  let steps: Array<{ position: number; step_type: string; config: Record<string, unknown> }> = [];
  if (a.current_version_id) {
    const { data: stepRows } = await supabase
      .from("marketing_automation_steps" as never)
      .select("position, step_type, config" as never)
      .eq("version_id" as never, a.current_version_id)
      .order("position" as never, { ascending: true });
    steps = (stepRows ?? []) as unknown as typeof steps;
  }

  // Load recent enrollments
  const { data: enrollments, count: enrollmentCount } = await supabase
    .from("marketing_automation_enrollments" as never)
    .select("id, customer_id, status, current_step_position, triggered_at, next_run_at, completed_at" as never, { count: "exact" })
    .eq("automation_id" as never, automationId)
    .order("triggered_at" as never, { ascending: false })
    .limit(20);

  type EnrollRow = {
    id: string; customer_id: string; status: EnrollmentStatus;
    current_step_position: number; triggered_at: string;
    next_run_at: string | null; completed_at: string | null;
  };

  const enrollmentRows = (enrollments ?? []) as unknown as EnrollRow[];

  function getStatusColor(status: AutomationStatus): "default" | "success" | "warning" | "error" {
    switch (status) {
      case "active": return "success";
      case "paused": return "warning";
      case "draft": return "default";
      case "archived": return "default";
    }
  }

  function formatStep(step: { step_type: string; config: Record<string, unknown> }): string {
    if (step.step_type === "delay") return `Wait ${step.config.value} ${step.config.unit}`;
    if (step.step_type === "condition") return `If ${String(step.config.field ?? "").replace(/_/g, " ")} ${step.config.operator} ${String(step.config.value ?? "")}`;
    if (step.step_type === "email") return `Send "${step.config.subject}"`;
    return step.step_type;
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title={a.name}
        description={a.description ?? undefined}
        breadcrumbs={[
          { label: "Automations", href: `/${tenantSlug}/automations` },
          { label: a.name },
        ]}
        status={<Chip label={a.status} size="small" color={getStatusColor(a.status)} />}
        action={<AutomationActionsClient tenantSlug={tenantSlug} automationId={a.id} status={a.status} steps={steps.map((s) => ({ stepType: s.step_type as "delay" | "condition" | "email", config: s.config }))} />}
      />

      {/* Metrics */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 1.5, bgcolor: "rgba(124, 58, 237, 0.08)", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#8B5CF6" }}>{enrollmentCount ?? 0}</Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "#8b8b9e" }}>Total Enrollments</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 1.5, bgcolor: "rgba(16, 185, 129, 0.08)", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#10B981" }}>{steps.length}</Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "#8b8b9e" }}>Steps</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 1.5, bgcolor: "rgba(245, 158, 11, 0.08)", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "#F59E0B" }}>{a.trigger_type.replace(/_/g, " ")}</Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "#8b8b9e" }}>Trigger</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Box sx={{ p: 1.5, bgcolor: "rgba(124, 58, 237, 0.08)", borderRadius: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "#8B5CF6" }}>{a.re_enrollment_policy.replace(/_/g, " ")}</Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "#8b8b9e" }}>Re-enrollment</Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Flow */}
      <SectionCard title="Flow">
        {steps.length === 0 ? (
          <Typography sx={{ fontSize: "0.8125rem", color: "#5c5c72" }}>No steps defined. Activate this automation to publish steps.</Typography>
        ) : (
          <Stack spacing={1}>
            <Box sx={{ p: 1, bgcolor: "rgba(124, 58, 237, 0.12)", borderRadius: 1, fontSize: "0.8125rem", fontWeight: 600, color: "#a78bfa" }}>
              WHEN {a.trigger_type.replace(/_/g, " ")}
            </Box>
            {steps.map((step, idx) => (
              <Box key={idx} sx={{ p: 1, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1, fontSize: "0.8125rem" }}>
                {formatStep(step)}
              </Box>
            ))}
          </Stack>
        )}
      </SectionCard>

      {/* Enrollments */}
      <SectionCard title={`Enrollments (${enrollmentCount ?? 0})`}>
        {enrollmentRows.length === 0 ? (
          <PlatformEmptyState title="No enrollments" description="Customers will appear here once the automation is triggered." />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Step</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Entered</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Next Run</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enrollmentRows.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{e.customer_id.slice(0, 8)}...</TableCell>
                  <TableCell><Chip label={e.status} size="small" color={e.status === "completed" ? "success" : e.status === "failed" ? "error" : "default"} /></TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{e.current_step_position}</TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", color: "#5c5c72" }}>{new Date(e.triggered_at).toLocaleDateString()}</TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", color: "#5c5c72" }}>{e.next_run_at ? new Date(e.next_run_at).toLocaleString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </Stack>
  );
}
