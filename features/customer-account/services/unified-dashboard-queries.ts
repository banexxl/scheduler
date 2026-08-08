import "server-only";

/**
 * Unified Customer Dashboard Queries — Milestone 9.2.
 */

import { getLinkedBusinesses } from "./customer-account-queries";
import { getUnifiedAppointments } from "./unified-appointment-queries";
import type { CustomerDashboardSummary, CustomerBusinessRewards } from "../types/unified-customer";

/**
 * Loads the unified customer dashboard summary.
 */
export async function getCustomerDashboardSummary(
  customerAccountId: string
): Promise<CustomerDashboardSummary> {
  const [businesses, upcoming] = await Promise.all([
    getLinkedBusinesses(customerAccountId),
    getUnifiedAppointments(customerAccountId, "upcoming", 5),
  ]);

  // Rewards placeholder — loaded per-tenant from loyalty/packages
  const rewards: CustomerBusinessRewards[] = businesses.map((b) => ({
    tenantSlug: b.tenantSlug,
    tenantName: b.tenantName,
    loyaltyPoints: null,
    loyaltyVisits: null,
    packageCredits: null,
    packageName: null,
  }));

  return {
    upcomingCount: upcoming.length,
    linkedBusinessCount: businesses.length,
    nextAppointment: upcoming[0] ?? null,
    rewards,
  };
}
