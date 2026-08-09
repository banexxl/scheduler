/**
 * Business Health Evaluator — Milestone 12.6.
 *
 * Pure evaluation function. No side effects. No mutations. No DB calls.
 * Takes pre-loaded inputs and returns health checks.
 */

import type { BusinessHealthCheck, BusinessHealthSummary } from "../types/business-health";

export type BusinessHealthInputs = {
  tenantTimezone: string | null;
  activeLocationCount: number;
  locationsWithHoursCount: number;
  activeServiceCount: number;
  servicesWithLocationCount: number;
  servicesWithResourceCount: number;
  activeResourceCount: number;
  resourcesWithHoursCount: number;
  publicBookingEnabled: boolean;
  hasFutureAvailability: boolean;
  emailProviderConfigured: boolean;
  emailFeaturesEnabled: boolean;
  recentEmailFailureCount: number;
  activeReminderRuleCount: number;
  onlinePaymentsEnabled: boolean;
  paymentProviderAvailable: boolean;
  failedDiscountSyncCount: number;
  unresolvedPaymentReviewCount: number;
  activeOwnerCount: number;
  unresolvedOperationalIssueCount: number;
};

export function evaluateBusinessHealth(inputs: BusinessHealthInputs): BusinessHealthSummary {
  const checks: BusinessHealthCheck[] = [];

  // ─── Business ──────────────────────────────────────────────────────────
  checks.push({
    key: "business.timezone",
    category: "business",
    title: "Business timezone",
    description: inputs.tenantTimezone ? `Timezone: ${inputs.tenantTimezone}` : "No timezone configured",
    status: inputs.tenantTimezone ? "ready" : "blocked",
    impact: inputs.tenantTimezone ? null : "Scheduling cannot work without a valid timezone",
    actionLabel: inputs.tenantTimezone ? null : "Configure settings",
    actionUrl: inputs.tenantTimezone ? null : "settings",
  });

  // ─── Locations ─────────────────────────────────────────────────────────
  checks.push({
    key: "locations.active",
    category: "locations",
    title: "Active locations",
    description: inputs.activeLocationCount > 0 ? `${inputs.activeLocationCount} active location(s)` : "No active locations",
    status: inputs.activeLocationCount > 0 ? "ready" : "blocked",
    impact: inputs.activeLocationCount > 0 ? null : "Customers cannot book without a location",
    actionLabel: inputs.activeLocationCount > 0 ? null : "Add location",
    actionUrl: inputs.activeLocationCount > 0 ? null : "locations",
  });

  if (inputs.activeLocationCount > 0) {
    checks.push({
      key: "locations.hours",
      category: "locations",
      title: "Location business hours",
      description: `${inputs.locationsWithHoursCount}/${inputs.activeLocationCount} locations have hours configured`,
      status: inputs.locationsWithHoursCount >= inputs.activeLocationCount ? "ready" : "needs_attention",
      impact: inputs.locationsWithHoursCount < inputs.activeLocationCount ? "Locations without hours cannot accept bookings" : null,
      actionLabel: inputs.locationsWithHoursCount < inputs.activeLocationCount ? "Configure hours" : null,
      actionUrl: inputs.locationsWithHoursCount < inputs.activeLocationCount ? "locations" : null,
    });
  }

  // ─── Services ──────────────────────────────────────────────────────────
  checks.push({
    key: "services.active",
    category: "services",
    title: "Active services",
    description: inputs.activeServiceCount > 0 ? `${inputs.activeServiceCount} active service(s)` : "No active services",
    status: inputs.activeServiceCount > 0 ? "ready" : "blocked",
    impact: inputs.activeServiceCount > 0 ? null : "No bookable services",
    actionLabel: inputs.activeServiceCount > 0 ? null : "Add service",
    actionUrl: inputs.activeServiceCount > 0 ? null : "services",
  });

  if (inputs.activeServiceCount > 0) {
    checks.push({
      key: "services.locations",
      category: "services",
      title: "Service location assignments",
      description: `${inputs.servicesWithLocationCount}/${inputs.activeServiceCount} services assigned to locations`,
      status: inputs.servicesWithLocationCount >= inputs.activeServiceCount ? "ready" : "blocked",
      impact: inputs.servicesWithLocationCount < inputs.activeServiceCount ? "Unassigned services cannot be booked" : null,
      actionLabel: inputs.servicesWithLocationCount < inputs.activeServiceCount ? "Assign locations" : null,
      actionUrl: inputs.servicesWithLocationCount < inputs.activeServiceCount ? "services" : null,
    });

    checks.push({
      key: "services.resources",
      category: "services",
      title: "Service resource assignments",
      description: `${inputs.servicesWithResourceCount}/${inputs.activeServiceCount} services have eligible resources`,
      status: inputs.servicesWithResourceCount >= inputs.activeServiceCount ? "ready" : "blocked",
      impact: inputs.servicesWithResourceCount < inputs.activeServiceCount ? "Services without resources cannot be booked" : null,
      actionLabel: inputs.servicesWithResourceCount < inputs.activeServiceCount ? "Assign resources" : null,
      actionUrl: inputs.servicesWithResourceCount < inputs.activeServiceCount ? "services" : null,
    });
  }

  // ─── Scheduling ────────────────────────────────────────────────────────
  if (inputs.activeResourceCount > 0) {
    checks.push({
      key: "resources.working_hours",
      category: "scheduling",
      title: "Resource working hours",
      description: `${inputs.resourcesWithHoursCount}/${inputs.activeResourceCount} resources have schedules`,
      status: inputs.resourcesWithHoursCount > 0 ? (inputs.resourcesWithHoursCount >= inputs.activeResourceCount ? "ready" : "needs_attention") : "blocked",
      impact: inputs.resourcesWithHoursCount === 0 ? "No bookable time slots available" : null,
      actionLabel: inputs.resourcesWithHoursCount < inputs.activeResourceCount ? "Configure schedules" : null,
      actionUrl: inputs.resourcesWithHoursCount < inputs.activeResourceCount ? "resources" : null,
    });
  }

  // ─── Booking ───────────────────────────────────────────────────────────
  if (inputs.publicBookingEnabled) {
    checks.push({
      key: "booking.future_availability",
      category: "booking",
      title: "Future availability",
      description: inputs.hasFutureAvailability ? "Bookable slots exist in the next 14 days" : "No availability found in the next 14 days",
      status: inputs.hasFutureAvailability ? "ready" : "needs_attention",
      impact: inputs.hasFutureAvailability ? null : "Customers cannot find available times",
      actionLabel: inputs.hasFutureAvailability ? null : "Check schedules",
      actionUrl: inputs.hasFutureAvailability ? null : "resources",
    });
  }

  checks.push({
    key: "booking.public",
    category: "booking",
    title: "Online booking",
    description: inputs.publicBookingEnabled ? "Public booking enabled" : "Online booking disabled",
    status: inputs.publicBookingEnabled ? "ready" : "optional",
    impact: null,
    actionLabel: inputs.publicBookingEnabled ? null : "Enable online booking",
    actionUrl: inputs.publicBookingEnabled ? null : "settings/public-booking",
  });

  // ─── Communications ────────────────────────────────────────────────────
  if (inputs.emailFeaturesEnabled) {
    checks.push({
      key: "communications.provider",
      category: "communications",
      title: "Email provider",
      description: inputs.emailProviderConfigured ? "Email delivery configured" : "Email provider not configured",
      status: inputs.emailProviderConfigured ? "ready" : "blocked",
      impact: inputs.emailProviderConfigured ? null : "Customer notifications cannot be sent",
      actionLabel: inputs.emailProviderConfigured ? null : "Configure notifications",
      actionUrl: inputs.emailProviderConfigured ? null : "settings/notifications",
    });

    if (inputs.recentEmailFailureCount > 0) {
      checks.push({
        key: "communications.failures",
        category: "communications",
        title: "Email delivery issues",
        description: `${inputs.recentEmailFailureCount} recent delivery failures`,
        status: "needs_attention",
        impact: "Some customer notifications were not delivered",
        actionLabel: "Review",
        actionUrl: "notifications",
      });
    }
  }

  // ─── Payments ──────────────────────────────────────────────────────────
  if (inputs.onlinePaymentsEnabled) {
    checks.push({
      key: "payments.provider",
      category: "payments",
      title: "Payment provider",
      description: inputs.paymentProviderAvailable ? "Polar payment available" : "Payment provider unavailable",
      status: inputs.paymentProviderAvailable ? "ready" : "blocked",
      impact: inputs.paymentProviderAvailable ? null : "Online payments cannot be processed",
      actionLabel: null,
      actionUrl: null,
    });

    if (inputs.failedDiscountSyncCount > 0) {
      checks.push({
        key: "payments.discount_sync",
        category: "payments",
        title: "Discount sync",
        description: `${inputs.failedDiscountSyncCount} discount(s) failed to sync`,
        status: "needs_attention",
        impact: "Failed discounts cannot be applied to checkouts",
        actionLabel: "Review discounts",
        actionUrl: "settings/payments/discounts",
      });
    }

    if (inputs.unresolvedPaymentReviewCount > 0) {
      checks.push({
        key: "payments.reconciliation",
        category: "payments",
        title: "Financial review",
        description: `${inputs.unresolvedPaymentReviewCount} payment(s) require review`,
        status: "needs_attention",
        impact: "Unresolved payment issues may affect customer experience",
        actionLabel: "Review payments",
        actionUrl: "payments",
      });
    }
  }

  // ─── Operations ────────────────────────────────────────────────────────
  checks.push({
    key: "team.owner",
    category: "operations",
    title: "Business owner",
    description: inputs.activeOwnerCount > 0 ? "Active owner exists" : "No active owner — critical",
    status: inputs.activeOwnerCount > 0 ? "ready" : "blocked",
    impact: inputs.activeOwnerCount > 0 ? null : "Business cannot operate without an owner",
    actionLabel: null,
    actionUrl: null,
  });

  if (inputs.unresolvedOperationalIssueCount > 0) {
    checks.push({
      key: "operations.issues",
      category: "operations",
      title: "Operational issues",
      description: `${inputs.unresolvedOperationalIssueCount} unresolved issue(s)`,
      status: "needs_attention",
      impact: "Pending operational items need attention",
      actionLabel: "View notifications",
      actionUrl: "notifications",
    });
  }

  // ─── Compute Overall ──────────────────────────────────────────────────
  const readyCount = checks.filter(c => c.status === "ready").length;
  const attentionCount = checks.filter(c => c.status === "needs_attention").length;
  const blockedCount = checks.filter(c => c.status === "blocked").length;
  const optionalCount = checks.filter(c => c.status === "optional").length;

  let overallStatus: "ready" | "needs_attention" | "blocked" = "ready";
  if (blockedCount > 0) overallStatus = "blocked";
  else if (attentionCount > 0) overallStatus = "needs_attention";

  return { overallStatus, readyCount, attentionCount, blockedCount, optionalCount, checks };
}
