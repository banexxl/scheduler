import "server-only";

/**
 * Appointment Payment Query Services — Milestone 11.1.
 *
 * Reads payment state for appointments. Uses admin client
 * because mutations are server-only (no direct client writes via RLS).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AppointmentPayment,
  BusinessAppointmentPayment,
  CustomerAppointmentPayment,
} from "../types/appointment-payment";
import type { PaymentIntent, PaymentIntentStatus } from "../types/payment-intent";

// ─── Get Appointment Payment ─────────────────────────────────────────────────

export async function getAppointmentPayment(
  tenantId: string,
  appointmentId: string
): Promise<AppointmentPayment | null> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointment_payments" as never)
    .select("*" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("appointment_id" as never, appointmentId)
    .maybeSingle();

  if (!data) return null;
  return mapPaymentRow(data as unknown as Record<string, unknown>);
}

// ─── Get Payment with Latest Intent ──────────────────────────────────────────

export async function getAppointmentPaymentWithLatestIntent(
  tenantId: string,
  appointmentId: string
): Promise<{ payment: AppointmentPayment; latestIntent: PaymentIntent | null } | null> {
  const payment = await getAppointmentPayment(tenantId, appointmentId);
  if (!payment) return null;

  let latestIntent: PaymentIntent | null = null;
  if (payment.latestPaymentIntentId) {
    const supabase = createAdminClient();
    const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("payment_intents" as never)
      .select("*" as never)
      .eq("id" as never, payment.latestPaymentIntentId)
      .eq("tenant_id" as never, tenantId)
      .maybeSingle();

    if (data) {
      latestIntent = mapIntentRow(data as unknown as Record<string, unknown>);
    }
  }

  return { payment, latestIntent };
}

// ─── Get Payment Intents for Appointment ─────────────────────────────────────

export async function getPaymentIntentsForAppointment(
  tenantId: string,
  appointmentId: string,
  limit = 20
): Promise<PaymentIntent[]> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_intents" as never)
    .select("*" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("appointment_id" as never, appointmentId)
    .order("created_at" as never, { ascending: false })
    .limit(Math.min(limit, 50));

  if (!data) return [];
  return (data as unknown as Array<Record<string, unknown>>).map(mapIntentRow);
}

// ─── Find Reusable Payment Intent ───────────────────────────────────────────

export async function getReusablePaymentIntent(
  tenantId: string,
  appointmentPaymentId: string,
  amount: number,
  currency: string
): Promise<PaymentIntent | null> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_intents" as never)
    .select("*" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("appointment_payment_id" as never, appointmentPaymentId)
    .in("status" as never, ["creating", "open"] as never)
    .eq("amount" as never, amount)
    .eq("currency" as never, currency)
    .order("created_at" as never, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return mapIntentRow(data as unknown as Record<string, unknown>);
}

// ─── Business DTO ────────────────────────────────────────────────────────────

export function toBusinessPaymentDTO(
  payment: AppointmentPayment,
  latestIntentStatus: PaymentIntentStatus | null
): BusinessAppointmentPayment {
  return {
    id: payment.id,
    status: payment.status,
    paymentRequirement: payment.paymentRequirement,
    provider: payment.provider,
    currency: payment.currency,
    amountTotal: payment.amountTotal,
    amountPaid: payment.amountPaid,
    amountRefunded: payment.amountRefunded,
    latestIntentStatus,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  };
}

// ─── Customer DTO ────────────────────────────────────────────────────────────

export function toCustomerPaymentDTO(
  payment: AppointmentPayment
): CustomerAppointmentPayment {
  return {
    status: payment.status,
    amountTotal: payment.amountTotal,
    amountPaid: payment.amountPaid,
    amountRefunded: payment.amountRefunded,
    currency: payment.currency,
    paymentRequired: payment.paymentRequirement !== "none",
  };
}

// ─── Row Mappers ─────────────────────────────────────────────────────────────

function mapPaymentRow(row: Record<string, unknown>): AppointmentPayment {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    appointmentId: row.appointment_id as string,
    status: row.status as AppointmentPayment["status"],
    paymentRequirement: row.payment_requirement as AppointmentPayment["paymentRequirement"],
    provider: (row.provider as AppointmentPayment["provider"]) ?? null,
    currency: row.currency as string,
    amountTotal: Number(row.amount_total),
    amountPaid: Number(row.amount_paid),
    amountRefunded: Number(row.amount_refunded),
    latestPaymentIntentId: (row.latest_payment_intent_id as string) ?? null,
    paidAt: (row.paid_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapIntentRow(row: Record<string, unknown>): PaymentIntent {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    appointmentId: row.appointment_id as string,
    appointmentPaymentId: row.appointment_payment_id as string,
    provider: row.provider as string,
    status: row.status as PaymentIntentStatus,
    amount: Number(row.amount),
    currency: row.currency as string,
    requestKey: row.request_key as string,
    providerCheckoutId: (row.provider_checkout_id as string) ?? null,
    providerOrderId: (row.provider_order_id as string) ?? null,
    providerPaymentId: (row.provider_payment_id as string) ?? null,
    checkoutUrl: (row.checkout_url as string) ?? null,
    failureCode: (row.failure_code as string) ?? null,
    failureMessage: (row.failure_message as string) ?? null,
    expiresAt: (row.expires_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
