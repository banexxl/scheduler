import { getPlatformBillingDashboardMetrics } from "@/features/platform/services/platform-billing-admin-queries";
import { getPlatformFinancialCounters } from "@/features/platform/services/platform-billing-order-queries";
import PremiumPlatformDashboard from "./premium-dashboard";

/**
 * Platform Admin Dashboard — Milestone 14.1 + Premium Redesign.
 *
 * Server component that loads metrics, delegates to the premium client dashboard.
 */
export default async function PlatformHomePage() {
  const metrics = await getPlatformBillingDashboardMetrics();
  const financialMetrics = await getPlatformFinancialCounters();

  return (
    <PremiumPlatformDashboard
      metrics={metrics}
      financialMetrics={financialMetrics}
    />
  );
}
