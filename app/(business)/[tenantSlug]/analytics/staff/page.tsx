import Stack from "@mui/material/Stack";
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
import AnalyticsNav from "@/features/analytics/components/analytics-nav";
import AnalyticsPeriodSelector from "@/features/analytics/components/analytics-period-selector";
import { resolveAdvancedDateRange } from "@/features/analytics/services/advanced-date-ranges";
import { getResourceUtilizationAnalytics } from "@/features/analytics/services/utilization-service";
import type { AdvancedAnalyticsPeriod } from "@/features/analytics/types/advanced-analytics";

export default async function StaffAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { tenantSlug } = await params;
  const { period: periodParam } = await searchParams;
  const { tenant } = await requireTenantMember(tenantSlug);
  const period = (periodParam ?? "30days") as AdvancedAnalyticsPeriod;

  const supabase = createServiceRoleClient();
  const { data: tenantData } = await supabase.from("tenants").select("default_timezone").eq("id", tenant.id).single();
  const timeZone = (tenantData as { default_timezone: string } | null)?.default_timezone ?? "UTC";

  const range = resolveAdvancedDateRange(period, new Date(), timeZone);
  const utilization = await getResourceUtilizationAnalytics(tenant.id, timeZone, range.start, range.end);

  return (
    <Stack spacing={2}>
      <PageHeader title="Staff & Resource Analytics" breadcrumbs={[{ label: "Analytics", href: `/${tenantSlug}/analytics` }, { label: "Staff" }]} />
      <AnalyticsNav tenantSlug={tenantSlug} />
      <AnalyticsPeriodSelector currentPeriod={period} />

      <SectionCard title="Resource Utilization">
        {utilization.length === 0 ? (
          <PlatformEmptyState title="No resource data" description="Active resources with working hours will appear here." />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Resource</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Appointments</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Completed</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Booked Min</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Available Min</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Utilization</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Customers</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {utilization.map((r) => (
                <TableRow key={r.resourceId} hover>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{r.resourceName}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{r.totalAppointments}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{r.completedAppointments}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{r.bookedMinutes}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{r.availableMinutes ?? "—"}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem", fontWeight: 600, color: r.utilization !== null && r.utilization > 0.7 ? "#16a34a" : r.utilization !== null && r.utilization > 0.4 ? "#ca8a04" : "#6b7280" }}>
                    {r.utilization !== null ? `${(r.utilization * 100).toFixed(1)}%` : "—"}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{r.uniqueCustomers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </Stack>
  );
}
