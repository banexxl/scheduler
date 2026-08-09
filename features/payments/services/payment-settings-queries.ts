import "server-only";

/**
 * Payment Settings Queries — Milestone 11.4.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { TenantPaymentSettings, ServicePaymentRule } from "../types/payment-settings";

// ─── Tenant Settings ─────────────────────────────────────────────────────────

export async function getTenantPaymentSettings(
  tenantId: string
): Promise<TenantPaymentSettings | null> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_appointment_payment_settings" as never)
    .select("tenant_id, online_payments_enabled, default_payment_requirement, payment_deadline_minutes, allow_pay_later" as never)
    .eq("tenant_id" as never, tenantId)
    .maybeSingle();

  if (!data) return null;

  const row = data as unknown as Record<string, unknown>;
  return {
    tenantId: row.tenant_id as string,
    onlinePaymentsEnabled: Boolean(row.online_payments_enabled),
    defaultPaymentRequirement: (row.default_payment_requirement as "none" | "full") ?? "none",
    paymentDeadlineMinutes: Number(row.payment_deadline_minutes ?? 15),
    allowPayLater: Boolean(row.allow_pay_later),
  };
}

export async function upsertTenantPaymentSettings(
  tenantId: string,
  input: {
    onlinePaymentsEnabled: boolean;
    defaultPaymentRequirement: "none" | "full";
    paymentDeadlineMinutes: number;
    allowPayLater: boolean;
  }
): Promise<{ success: boolean }> {
  const supabase = createAdminClient();

  const { error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_appointment_payment_settings" as never)
    .upsert({
      tenant_id: tenantId,
      online_payments_enabled: input.onlinePaymentsEnabled,
      default_payment_requirement: input.defaultPaymentRequirement,
      payment_deadline_minutes: input.paymentDeadlineMinutes,
      allow_pay_later: input.allowPayLater,
    } as never, { onConflict: "tenant_id" } as never);

  return { success: !error };
}

// ─── Service Payment Rules ───────────────────────────────────────────────────

export async function getServicePaymentRule(
  tenantId: string,
  serviceId: string
): Promise<ServicePaymentRule | null> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("service_payment_rules" as never)
    .select("service_id, payment_requirement, payment_deadline_minutes" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("service_id" as never, serviceId)
    .maybeSingle();

  if (!data) return null;

  const row = data as unknown as Record<string, unknown>;
  return {
    serviceId: row.service_id as string,
    paymentRequirement: (row.payment_requirement as "none" | "full" | null) ?? null,
    paymentDeadlineMinutes: row.payment_deadline_minutes != null ? Number(row.payment_deadline_minutes) : null,
  };
}

export async function upsertServicePaymentRule(
  tenantId: string,
  serviceId: string,
  input: { paymentRequirement: "none" | "full" | null; paymentDeadlineMinutes: number | null }
): Promise<{ success: boolean }> {
  const supabase = createAdminClient();

  const { error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("service_payment_rules" as never)
    .upsert({
      tenant_id: tenantId,
      service_id: serviceId,
      payment_requirement: input.paymentRequirement,
      payment_deadline_minutes: input.paymentDeadlineMinutes,
    } as never, { onConflict: "tenant_id,service_id" } as never);

  return { success: !error };
}
