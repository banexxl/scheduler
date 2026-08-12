"use server";

/**
 * Create Appointment Refund Action — Milestone 11.5.
 * Owner/admin only.
 */

import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createAppointmentRefund, getRefundableAmount } from "../services/create-appointment-refund";
import { getAppointmentPayment } from "../services/appointment-payment-queries";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import type { CreateRefundResult, RefundReasonCode } from "../types/payment-refund";

export async function createRefundAction(
  tenantSlug: string,
  appointmentId: string,
  input: { amount: number; reasonCode: RefundReasonCode; reasonNote?: string }
): Promise<CreateRefundResult> {
  try {
    const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
    const log = createServerActionLogger({
      action: "payments.refund",
      tenantId: tenant.id,
      userId: user.id,
    });

    const result = await createAppointmentRefund({
      tenantId: tenant.id,
      appointmentId,
      amount: input.amount,
      reasonCode: input.reasonCode,
      reasonNote: input.reasonNote ?? null,
      requestedBy: user.id,
    });

    if (result.success) {
      await log.success({ appointmentId, amount: input.amount, reasonCode: input.reasonCode });
    } else {
      await log.failure(new Error(result.error ?? "refund failed"), { appointmentId });
    }

    return result;
  } catch {
    return { success: false, error: "Failed to create refund.", code: "INTERNAL" };
  }
}

export async function getRefundableAmountAction(
  tenantSlug: string,
  appointmentId: string
): Promise<{ refundable: number; currency: string } | null> {
  try {
    const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

    const payment = await getAppointmentPayment(tenant.id, appointmentId);
    if (!payment || payment.amountPaid === 0) return null;

    const { refundable } = await getRefundableAmount(tenant.id, payment.id);
    return { refundable, currency: payment.currency };
  } catch {
    return null;
  }
}
