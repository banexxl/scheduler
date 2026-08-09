"use server";

/**
 * Update Payment Settings Actions — Milestone 11.4.
 */

import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { upsertTenantPaymentSettings, upsertServicePaymentRule } from "../services/payment-settings-queries";
import { isAppointmentPaymentProviderAvailable } from "../services/resolve-payment-requirement";

type ActionResult = { success: true } | { success: false; error: string };

// ─── Update Tenant Payment Settings ──────────────────────────────────────────

export async function updateTenantPaymentSettingsAction(
  tenantSlug: string,
  input: {
    onlinePaymentsEnabled: boolean;
    defaultPaymentRequirement: "none" | "full";
    paymentDeadlineMinutes: number;
    allowPayLater: boolean;
  }
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

    // Validate deadline bounds
    if (input.paymentDeadlineMinutes < 5 || input.paymentDeadlineMinutes > 60) {
      return { success: false, error: "Deadline must be between 5 and 60 minutes." };
    }

    // Validate requirement values
    if (!["none", "full"].includes(input.defaultPaymentRequirement)) {
      return { success: false, error: "Invalid payment requirement." };
    }

    // If enabling with 'full' requirement, verify provider is available
    if (input.onlinePaymentsEnabled && input.defaultPaymentRequirement === "full") {
      const provider = isAppointmentPaymentProviderAvailable();
      if (!provider.available) {
        return { success: false, error: "Payment provider is not configured. Contact platform support." };
      }
    }

    const result = await upsertTenantPaymentSettings(tenant.id, input);
    if (!result.success) return { success: false, error: "Failed to save payment settings." };

    return { success: true };
  } catch {
    return { success: false, error: "Failed to save payment settings." };
  }
}

// ─── Update Service Payment Rule ─────────────────────────────────────────────

export async function updateServicePaymentRuleAction(
  tenantSlug: string,
  serviceId: string,
  input: {
    paymentRequirement: "none" | "full" | null;
    paymentDeadlineMinutes: number | null;
  }
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

    // Validate deadline if present
    if (input.paymentDeadlineMinutes != null) {
      if (input.paymentDeadlineMinutes < 5 || input.paymentDeadlineMinutes > 60) {
        return { success: false, error: "Deadline must be between 5 and 60 minutes." };
      }
    }

    // Validate requirement
    if (input.paymentRequirement != null && !["none", "full"].includes(input.paymentRequirement)) {
      return { success: false, error: "Invalid payment requirement." };
    }

    const result = await upsertServicePaymentRule(tenant.id, serviceId, input);
    if (!result.success) return { success: false, error: "Failed to save service payment rule." };

    return { success: true };
  } catch {
    return { success: false, error: "Failed to save service payment rule." };
  }
}
