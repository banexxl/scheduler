/**
 * Payment Settings Types — Milestone 11.4.
 *
 * Tenant-level and service-level payment requirement configuration.
 */

// ─── Tenant Payment Settings ─────────────────────────────────────────────────

export type TenantPaymentSettings = {
  tenantId: string;
  onlinePaymentsEnabled: boolean;
  defaultPaymentRequirement: "none" | "full";
  paymentDeadlineMinutes: number;
  allowPayLater: boolean;
};

export type UpdateTenantPaymentSettingsInput = {
  onlinePaymentsEnabled: boolean;
  defaultPaymentRequirement: "none" | "full";
  paymentDeadlineMinutes: number;
  allowPayLater: boolean;
};

// ─── Service Payment Rules ───────────────────────────────────────────────────

export type ServicePaymentRule = {
  serviceId: string;
  paymentRequirement: "none" | "full" | null;
  paymentDeadlineMinutes: number | null;
};

export type UpdateServicePaymentRuleInput = {
  paymentRequirement: "none" | "full" | null;
  paymentDeadlineMinutes: number | null;
};

// ─── Resolved Payment Requirement ────────────────────────────────────────────

export type ResolvedPaymentRequirement = {
  requirement: "none" | "full";
  deadlineMinutes: number | null;
  source: {
    requirement: "service" | "tenant" | "default";
    deadline: "service" | "tenant" | "default" | null;
  };
  onlinePaymentEnabled: boolean;
};

// ─── Provider Availability ───────────────────────────────────────────────────

export type PaymentProviderAvailability = {
  available: boolean;
  reason: string | null;
};
