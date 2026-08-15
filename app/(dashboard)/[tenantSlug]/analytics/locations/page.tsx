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

export default async function LocationAnalyticsPage({
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

  const { data: locationData } = await supabase
    .from("appointments")
    .select("location_id, location_name_snapshot, status, customer_id")
    .eq("tenant_id", tenant.id)
    .gte("starts_at", range.start)
    .lt("starts_at", range.end)
    .limit(10000);

  type Row = { location_id: string; location_name_snapshot: string; status: string; customer_id: string | null };
  const rows = (locationData ?? []) as Row[];

  const locMap = new Map<string, { name: string; total: number; completed: number; cancelled: number; noShow: number; customers: Set<string> }>();
  for (const row of rows) {
    const existing = locMap.get(row.location_id) ?? { name: row.location_name_snapshot, total: 0, completed: 0, cancelled: 0, noShow: 0, customers: new Set<string>() };
    existing.total++;
    if (row.status === "completed") existing.completed++;
    if (row.status === "cancelled") existing.cancelled++;
    if (row.status === "no_show") existing.noShow++;
    if (row.customer_id && row.status !== "cancelled") existing.customers.add(row.customer_id);
    locMap.set(row.location_id, existing);
  }

  const locations = Array.from(locMap.entries())
    .map(([id, data]) => ({ locationId: id, ...data, uniqueCustomers: data.customers.size }))
    .sort((a, b) => b.total - a.total);

  return (
    <Stack spacing={2}>
      <PageHeader title="Location Analytics" breadcrumbs={[{ label: "Analytics", href: `/${tenantSlug}/analytics` }, { label: "Locations" }]} />
      <AnalyticsNav tenantSlug={tenantSlug} />
      <AnalyticsPeriodSelector currentPeriod={period} />

      <SectionCard title="Location Performance">
        {locations.length === 0 ? (
          <PlatformEmptyState title="No location data" description="Location performance will appear here." />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Completed</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>No-show Rate</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Customers</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locations.map((l) => (
                <TableRow key={l.locationId} hover>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{l.name}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{l.total}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{l.completed}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{safePercentage(l.noShow, l.completed + l.noShow)?.toFixed(1) ?? "0"}%</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{l.uniqueCustomers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </Stack>
  );
}
