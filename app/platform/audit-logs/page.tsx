import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Platform Audit Logs — Milestone 14.1.
 *
 * Shows tenant deletion events and server logs (recent errors).
 * Full audit_logs table is deferred (table doesn't exist yet).
 */

function formatDate(iso: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function AuditLogsPage() {
  const adminClient = createAdminClient();

  // Load tenant deletion events
  const { data: deletionEvents } = await adminClient
    .from("tenant_deletion_events" as never)
    .select("*")
    .order("deleted_at" as never, { ascending: false })
    .limit(50);

  // Load recent server log errors
  const { data: recentErrors } = await adminClient
    .from("server_logs" as never)
    .select("id, action, status, error_code, error_message, tenant_id, user_id, created_at, duration_ms")
    .eq("level" as never, "error")
    .order("created_at" as never, { ascending: false })
    .limit(30);

  const deletions = (deletionEvents as Array<Record<string, unknown>> | null) ?? [];
  const errors = (recentErrors as Array<Record<string, unknown>> | null) ?? [];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Audit Logs"
        description="Security events and operational diagnostics."
        breadcrumbs={[
          { label: "Platform", href: "/platform" },
          { label: "Audit Logs" },
        ]}
      />

      {/* Tenant Deletions */}
      <SectionCard title="Tenant Deletions" description="Permanent record of deleted businesses.">
        {deletions.length === 0 ? (
          <PlatformEmptyState title="No deletions" description="No tenants have been deleted." />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Tenant</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Slug</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Actor</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Deleted At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deletions.map((event) => (
                  <TableRow key={String(event.id)} hover>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>{String(event.tenant_name ?? "")}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#8b8b9e" }}>/{String(event.tenant_slug ?? "")}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#8b8b9e" }}>
                      {String(event.actor_user_id ?? "").slice(0, 8)}...
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem" }}>{formatDate(String(event.deleted_at ?? ""))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      {/* Recent Errors */}
      <SectionCard title="Recent Server Errors" description="Last 30 error-level server log entries.">
        {errors.length === 0 ? (
          <PlatformEmptyState title="No errors" description="No recent server errors logged." />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Error</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {errors.map((err) => (
                  <TableRow key={String(err.id)} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                        {String(err.action ?? "")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: "0.75rem", color: "#EF4444" }}>
                        {String(err.error_code ?? "")}
                      </Typography>
                      <Typography sx={{ fontSize: "0.7rem", color: "#8b8b9e", maxWidth: 300 }} noWrap>
                        {String(err.error_message ?? "")}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem" }}>
                      {err.duration_ms ? `${err.duration_ms}ms` : "-"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#8b8b9e" }}>
                      {formatDate(String(err.created_at ?? ""))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>
    </Stack>
  );
}
