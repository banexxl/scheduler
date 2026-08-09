/**
 * Payment Requirement Resolver — Milestone 11.4.
 *
 * Pure utility that resolves the effective payment requirement for an
 * appointment based on tenant settings, service overrides, and price.
 *
 * Precedence: service override → tenant default → application default.
 * Zero-price services always resolve to 'none'.
 */

import type {
  TenantPaymentSettings,
  ServicePaymentRule,
  ResolvedPaymentRequirement,
  PaymentProviderAvailability,
} from "../types/payment-settings";

const APPLICATION_DEFAULT_REQUIREMENT = "none" as const;
const APPLICATION_DEFAULT_DEADLINE = 15;

/**
 * Resolves effective payment requirement for an appointment.
 *
 * Rules:
 * 1. If online payments disabled at tenant level → none
 * 2. If appointment price = 0 → none
 * 3. If provider not available → none
 * 4. Service override (if non-null) → use it
 * 5. Tenant default → use it
 * 6. Application default → none
 */
export function resolveAppointmentPaymentRequirement(input: {
  tenantSettings: TenantPaymentSettings | null;
  serviceRule: ServicePaymentRule | null;
  appointmentPrice: number;
  providerAvailability: PaymentProviderAvailability;
}): ResolvedPaymentRequirement {
  const { tenantSettings, serviceRule, appointmentPrice, providerAvailability } = input;

  // Zero-price → never require payment
  if (appointmentPrice <= 0) {
    return {
      requirement: "none",
      deadlineMinutes: null,
      source: { requirement: "default", deadline: null },
      onlinePaymentEnabled: false,
    };
  }

  // Online payments not enabled at tenant level
  if (!tenantSettings?.onlinePaymentsEnabled) {
    return {
      requirement: "none",
      deadlineMinutes: null,
      source: { requirement: "tenant", deadline: null },
      onlinePaymentEnabled: false,
    };
  }

  // Provider not available
  if (!providerAvailability.available) {
    return {
      requirement: "none",
      deadlineMinutes: null,
      source: { requirement: "default", deadline: null },
      onlinePaymentEnabled: false,
    };
  }

  // Resolve requirement: service override → tenant default
  let requirement: "none" | "full" = APPLICATION_DEFAULT_REQUIREMENT;
  let requirementSource: "service" | "tenant" | "default" = "default";

  if (serviceRule?.paymentRequirement != null) {
    requirement = serviceRule.paymentRequirement;
    requirementSource = "service";
  } else if (tenantSettings.defaultPaymentRequirement) {
    requirement = tenantSettings.defaultPaymentRequirement;
    requirementSource = "tenant";
  }

  // Resolve deadline: service override → tenant default
  let deadlineMinutes: number | null = null;
  let deadlineSource: "service" | "tenant" | "default" | null = null;

  if (requirement === "full") {
    if (serviceRule?.paymentDeadlineMinutes != null) {
      deadlineMinutes = serviceRule.paymentDeadlineMinutes;
      deadlineSource = "service";
    } else if (tenantSettings.paymentDeadlineMinutes) {
      deadlineMinutes = tenantSettings.paymentDeadlineMinutes;
      deadlineSource = "tenant";
    } else {
      deadlineMinutes = APPLICATION_DEFAULT_DEADLINE;
      deadlineSource = "default";
    }
  }

  return {
    requirement,
    deadlineMinutes,
    source: { requirement: requirementSource, deadline: deadlineSource },
    onlinePaymentEnabled: true,
  };
}

/**
 * Checks if appointment payment provider is available.
 * Verifies necessary Polar credentials exist without calling the API.
 */
export function isAppointmentPaymentProviderAvailable(): PaymentProviderAvailability {
  const hasAccessToken = Boolean(process.env.POLAR_ACCESS_TOKEN?.trim());

  if (!hasAccessToken) {
    return { available: false, reason: "Payment provider not configured." };
  }

  return { available: true, reason: null };
}
