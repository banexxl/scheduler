import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";

/**
 * Import History Page — Milestone 15.10.
 */
export default async function ImportsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin", "manager"]);

  const supabase = createServiceRoleClient();
  const { data: jobs } = await supabase
    .from("data_import_jobs" as never)
    .select("id, import_type, status, original_filename, total_rows, created_rows, failed_rows, created_at" as never)
    .eq("tenant_id" as never, tenant.id)
    .order("created_at" as never, { ascending: false })
    .limit(50);

  type JobRow = { id: string; import_type: string; status: string; original_filename: string; total_rows: number; created_rows: number; failed_rows: number; created_at: string };
  const rows = (jobs ?? []) as unknown as JobRow[];

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Data Imports"
        description="Import customers, services, and staff from CSV files."
        breadcrumbs={[{ label: "Imports" }]}
        action={<Button href={`/${tenantSlug}/imports/new`} variant="contained" size="small">New Import</Button>}
      />
      <SectionCard title="Import History">
        {rows.length === 0 ? (
          <PlatformEmptyState title="No imports yet" description="Upload a CSV to import customers, services, or staff." />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>File</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Rows</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Date</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((j) => (
                <TableRow key={j.id} hover>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{j.original_filename}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{j.import_type.replace(/_/g, " ")}</TableCell>
                  <TableCell><Chip label={j.status.replace(/_/g, " ")} size="small" color={j.status === "completed" ? "success" : j.status === "failed" ? "error" : "default"} /></TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{j.total_rows}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{j.created_rows}</TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>{new Date(j.created_at).toLocaleDateString()}</TableCell>
                  <TableCell><Button href={`/${tenantSlug}/imports/${j.id}`} size="small" variant="text">View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </Stack>
  );
}
