import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getTenantFinancialHistory, getTenantPaymentSummary } from "@/features/payments/services/financial-history-queries";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import PaymentsClientPage from "./client-page";

export default async function TenantPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60_000).toISOString();
  const defaultTo = now.toISOString();

  const dateFrom = query.from ?? defaultFrom;
  const dateTo = query.to ?? defaultTo;
  const type = (query.type as "appointment_payment" | "package_purchase" | undefined) ?? undefined;

  const [history, summary] = await Promise.all([
    getTenantFinancialHistory(tenant.id, { type, dateFrom, dateTo }, 25, 0),
    getTenantPaymentSummary(tenant.id, dateFrom, dateTo),
  ]);

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Payments"
        description="Customer payment history for appointments and packages."
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Payments" },
        ]}
      />

      {/* Summary per currency */}
      <Grid container spacing={2}>
        {summary.currencies.map((curr) => (
          <Grid key={curr.currency} size={{ xs: 6, sm: 4, md: 3 }}>
            <MetricCard
              label={`Collected (${curr.currency})`}
              value={curr.paymentsReceived.toLocaleString()}
              secondary={curr.refunded > 0 ? `Refunded: ${curr.refunded.toLocaleString()}` : undefined}
              variant="success"
            />
          </Grid>
        ))}
        {summary.currencies.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <MetricCard label="Payments" value="No payments yet" />
          </Grid>
        )}
      </Grid>

      <PaymentsClientPage
        tenantSlug={tenantSlug}
        history={history.items}
        summary={summary}
        dateFrom={dateFrom}
        dateTo={dateTo}
        typeFilter={type ?? null}
      />
    </Stack>
  );
}
