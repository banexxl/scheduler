import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getTenantFinancialHistory, getTenantPaymentSummary } from "@/features/payments/services/financial-history-queries";
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
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        Payments
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Customer payment history for appointments and packages.
      </Typography>
      <PaymentsClientPage
        tenantSlug={tenantSlug}
        history={history.items}
        summary={summary}
        dateFrom={dateFrom}
        dateTo={dateTo}
        typeFilter={type ?? null}
      />
    </Box>
  );
}
