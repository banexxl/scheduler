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
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import SectionCard from "@/features/platform/components/section-card";
import { getTenantFeatureOverrides } from "@/features/platform/services/feature-override-service";
import { getActiveSupportSession } from "@/features/platform/actions/support-session-actions";
import TenantSupportActions from "./support-actions-client";

/**
 * Tenant Support Workspace — Milestone 15.11.
 *
 * Primary support view for platform operators to diagnose and support a tenant.
 */
export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const { user } = await requirePlatformAdmin();

  const supabase = createServiceRoleClient();

  // Load tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug, status, default_timezone, default_currency, created_at")
    .eq("id", tenantId)
    .single();

  if (!tenant) notFound();

  // Counts
  const [members, locations, resources, services, customers] = await Promise.all([
    supabase.from("tenant_members" as never).select("id" as never, { count: "exact", head: true }).eq("tenant_id" as never, tenantId).eq("status" as never, "active"),
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true),
    supabase.from("tenant_customers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
  ]);

  // Feature overrides
  const overrides = await getTenantFeatureOverrides(tenantId);

  // Active support session
  const activeSession = await getActiveSupportSession(user.id, tenantId);

  // Recent server logs for tenant
  const { data: recentLogs } = await supabase
    .from("server_logs" as never)
    .select("id, action, status, level, created_at, duration_ms" as never)
    .eq("tenant_id" as never, tenantId)
    .order("created_at" as never, { ascending: false })
    .limit(10);

  type LogRow = { id: string; action: string; status: string; level: string; created_at: string; duration_ms: number | null };
  const logs = (recentLogs ?? []) as unknown as LogRow[];

  return (
    <Stack spacing={2}>
      <PageHeader
        title={`Support: ${tenant.name}`}
        description={`/${tenant.slug} — ${tenant.status}`}
        breadcrumbs={[
          { label: "Platform", href: "/platform" },
          { label: "Tenants", href: "/platform/tenants" },
          { label: tenant.name },
        ]}
        status={<Chip label={tenant.status} size="small" color={tenant.status === "active" ? "success" : "default"} />}
      />

      {/* Support Session Banner */}
      {activeSession && (
        <Box sx={{ p: 2, bgcolor: "rgba(245, 158, 11, 0.12)", border: "2px solid #f59e0b", borderRadius: 1.5 }}>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#F59E0B" }}>
            SUPPORT MODE — Session active until {new Date(activeSession.expiresAt).toLocaleTimeString()}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "rgba(245, 158, 11, 0.7)" }}>Reason: {activeSession.reason}</Typography>
        </Box>
      )}

      {/* Metrics */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 2 }}><MetricCard label="Members" value={members.count ?? 0} /></Grid>
        <Grid size={{ xs: 6, sm: 2 }}><MetricCard label="Locations" value={locations.count ?? 0} /></Grid>
        <Grid size={{ xs: 6, sm: 2 }}><MetricCard label="Resources" value={resources.count ?? 0} /></Grid>
        <Grid size={{ xs: 6, sm: 2 }}><MetricCard label="Services" value={services.count ?? 0} /></Grid>
        <Grid size={{ xs: 6, sm: 2 }}><MetricCard label="Customers" value={customers.count ?? 0} /></Grid>
      </Grid>

      {/* Support Actions */}
      <SectionCard title="Support Actions">
        <TenantSupportActions tenantId={tenantId} activeSessionId={activeSession?.id ?? null} />
      </SectionCard>

      {/* Feature Overrides */}
      <SectionCard title="Feature Overrides (Kill Switches)">
        {overrides.length === 0 ? (
          <Typography sx={{ fontSize: "0.8125rem", color: "#5c5c72" }}>No active platform overrides. Tenant settings are in effect.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Feature</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>State</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Expires</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overrides.map((o) => (
                <TableRow key={o.feature}>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{o.feature.replace(/_/g, " ")}</TableCell>
                  <TableCell><Chip label={o.enabled ? "Enabled" : "Disabled"} size="small" color={o.enabled ? "success" : "error"} /></TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", color: "#8b8b9e" }}>{o.reason}</TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", color: "#5c5c72" }}>{o.expiresAt ? new Date(o.expiresAt).toLocaleString() : "Never"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Recent Activity */}
      <SectionCard title="Recent Operational Events">
        {logs.length === 0 ? (
          <Typography sx={{ fontSize: "0.8125rem", color: "#5c5c72" }}>No recent activity.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Duration</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell sx={{ fontSize: "0.75rem", color: "#8b8b9e" }}>{new Date(l.created_at).toLocaleTimeString()}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{l.action}</TableCell>
                  <TableCell><Chip label={l.status} size="small" color={l.status === "success" ? "success" : l.status === "failure" ? "error" : "default"} /></TableCell>
                  <TableCell sx={{ fontSize: "0.75rem" }}>{l.duration_ms ? `${l.duration_ms}ms` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </Stack>
  );
}
