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
import { safePercentage } from "@/features/analytics/utils/currency-utils";
import type { AdvancedAnalyticsPeriod } from "@/features/analytics/types/advanced-analytics";

export default async function ServiceAnalyticsPage({
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

  // Service breakdown from appointments
  const { data: serviceData } = await supabase
    .from("appointments")
    .select("service_id, service_name_snapshot, status, customer_id")
    .eq("tenant_id", tenant.id)
    .gte("starts_at", range.start)
    .lt("starts_at", range.end)
    .limit(10000);

  type ApptRow = { service_id: string; service_name_snapshot: string; status: string; customer_id: string | null };
  const rows = (serviceData ?? []) as ApptRow[];

  // Aggregate by service
  const serviceMap = new Map<string, { name: string; total: number; completed: number; cancelled: number; noShow: number; customers: Set<string> }>();
  for (const row of rows) {
    const existing = serviceMap.get(row.service_id) ?? { name: row.service_name_snapshot, total: 0, completed: 0, cancelled: 0, noShow: 0, customers: new Set<string>() };
    existing.total++;
    if (row.status === "completed") existing.completed++;
    if (row.status === "cancelled") existing.cancelled++;
    if (row.status === "no_show") existing.noShow++;
    if (row.customer_id && row.status !== "cancelled") existing.customers.add(row.customer_id);
    serviceMap.set(row.service_id, existing);
  }

  const services = Array.from(serviceMap.entries())
    .map(([id, data]) => ({ serviceId: id, ...data, uniqueCustomers: data.customers.size }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 25);

  return (
    <Stack spacing={2}>
      <PageHeader title="Service Analytics" breadcrumbs={[{ label: "Analytics", href: `/${tenantSlug}/analytics` }, { label: "Services" }]} />
      <AnalyticsNav tenantSlug={tenantSlug} />
      <AnalyticsPeriodSelector currentPeriod={period} />

      <SectionCard title="Service Performance">
        {services.length === 0 ? (
          <PlatformEmptyState title="No service data" description="Appointments will be shown here broken down by service." />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Completed</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Cancelled</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>No-show</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Completion %</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Customers</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.serviceId} hover>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{s.name}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{s.total}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{s.completed}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{s.cancelled}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{s.noShow}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{safePercentage(s.completed, s.completed + s.cancelled + s.noShow)?.toFixed(1) ?? "—"}%</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{s.uniqueCustomers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </Stack>
  );
}
