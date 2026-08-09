import "server-only";

/**
 * Financial History Query Services — Milestone 11.8.
 *
 * Provides normalized payment history across appointment payments
 * and package purchases. Uses DB aggregation for summaries.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  TenantFinancialHistoryItem,
  TenantPaymentSummary,
  CurrencySummary,
  FinancialHistoryFilters,
} from "../types/financial-history";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

// ─── Tenant Financial History ────────────────────────────────────────────────

export async function getTenantFinancialHistory(
  tenantId: string,
  filters: FinancialHistoryFilters = {},
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
): Promise<{ items: TenantFinancialHistoryItem[]; total: number }> {
  const supabase = createAdminClient();
  const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const items: TenantFinancialHistoryItem[] = [];

  // Load appointment payments
  if (!filters.type || filters.type === "appointment_payment") {
    let query = (supabase as never as ReturnType<typeof createAdminClient>)
      .from("appointment_payments" as never)
      .select("id, appointment_id, status, currency, amount_total, amount_paid, amount_refunded, discount_amount_snapshot, original_amount, paid_at, created_at, receipt_available" as never)
      .eq("tenant_id" as never, tenantId)
      .not("status" as never, "eq", "not_required");

    if (filters.dateFrom) query = query.gte("created_at" as never, filters.dateFrom);
    if (filters.dateTo) query = query.lt("created_at" as never, filters.dateTo);
    if (filters.status) query = query.eq("status" as never, filters.status);

    const { data: apptRows } = await query
      .order("created_at" as never, { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (apptRows) {
      const rows = apptRows as unknown as Array<Record<string, unknown>>;
      const apptIds = rows.map(r => r.appointment_id as string);

      const customerMap = new Map<string, { name: string; number: string }>();
      if (apptIds.length > 0) {
        const { data: appts } = await (supabase as never as ReturnType<typeof createAdminClient>)
          .from("appointments" as never)
          .select("id, customer_name, appointment_number" as never)
          .in("id" as never, apptIds as never);
        if (appts) {
          for (const a of appts as unknown as Array<{ id: string; customer_name: string; appointment_number: string }>) {
            customerMap.set(a.id, { name: a.customer_name, number: a.appointment_number });
          }
        }
      }

      for (const row of rows) {
        const apptInfo = customerMap.get(row.appointment_id as string);
        const paidAmt = Number(row.amount_paid ?? 0);
        const refundedAmt = Number(row.amount_refunded ?? 0);
        items.push({
          id: row.id as string,
          type: "appointment_payment",
          customerName: apptInfo?.name ?? "Customer",
          description: `Appointment ${apptInfo?.number ?? ""}`.trim(),
          status: row.status as string,
          originalAmount: Number(row.original_amount ?? row.amount_total),
          discountAmount: Number(row.discount_amount_snapshot ?? 0),
          paidAmount: paidAmt,
          refundedAmount: refundedAmt,
          netCustomerPayment: paidAmt - refundedAmt,
          currency: row.currency as string,
          createdAt: row.created_at as string,
          paidAt: (row.paid_at as string) ?? null,
          appointmentNumber: apptInfo?.number ?? null,
          receiptAvailable: Boolean(row.receipt_available),
        });
      }
    }
  }

  // Load package purchases
  if (!filters.type || filters.type === "package_purchase") {
    let query = (supabase as never as ReturnType<typeof createAdminClient>)
      .from("package_purchases" as never)
      .select("id, tenant_customer_id, status, currency, amount_total, package_name_snapshot, discount_amount_snapshot, original_amount, paid_at, created_at, receipt_available" as never)
      .eq("tenant_id" as never, tenantId)
      .in("status" as never, ["paid", "fulfilled", "refunded", "requires_review"] as never);

    if (filters.dateFrom) query = query.gte("created_at" as never, filters.dateFrom);
    if (filters.dateTo) query = query.lt("created_at" as never, filters.dateTo);

    const { data: pkgRows } = await query
      .order("created_at" as never, { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (pkgRows) {
      const rows = pkgRows as unknown as Array<Record<string, unknown>>;
      const customerIds = [...new Set(rows.map(r => r.tenant_customer_id as string))];
      const nameMap = new Map<string, string>();
      if (customerIds.length > 0) {
        const { data: customers } = await (supabase as never as ReturnType<typeof createAdminClient>)
          .from("tenant_customers" as never)
          .select("id, name" as never)
          .in("id" as never, customerIds as never);
        if (customers) {
          for (const c of customers as unknown as Array<{ id: string; name: string }>) {
            nameMap.set(c.id, c.name);
          }
        }
      }

      for (const row of rows) {
        const paidAmt = Number(row.amount_total);
        items.push({
          id: row.id as string,
          type: "package_purchase",
          customerName: nameMap.get(row.tenant_customer_id as string) ?? "Customer",
          description: `Package: ${row.package_name_snapshot}`,
          status: row.status as string,
          originalAmount: Number(row.original_amount ?? row.amount_total),
          discountAmount: Number(row.discount_amount_snapshot ?? 0),
          paidAmount: paidAmt,
          refundedAmount: 0,
          netCustomerPayment: paidAmt,
          currency: row.currency as string,
          createdAt: row.created_at as string,
          paidAt: (row.paid_at as string) ?? null,
          appointmentNumber: null,
          receiptAvailable: Boolean(row.receipt_available),
        });
      }
    }
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { items: items.slice(0, safeLimit), total: items.length };
}

// ─── Tenant Payment Summary ──────────────────────────────────────────────────

export async function getTenantPaymentSummary(
  tenantId: string,
  dateFrom: string,
  dateTo: string
): Promise<TenantPaymentSummary> {
  const supabase = createAdminClient();

  const { data: rpcResult } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .rpc("get_tenant_payment_summary" as never, {
      p_tenant_id: tenantId,
      p_from: dateFrom,
      p_to: dateTo,
    } as never);

  const result = (rpcResult as unknown as Record<string, unknown>) ?? {};
  const apptData = (result.appointment_payments as Record<string, unknown>) ?? {};
  const pkgData = (result.package_purchases as Record<string, unknown>) ?? {};
  const refundData = (result.refunds as Record<string, unknown>) ?? {};

  const apptCurrencies = (apptData.currencies as Record<string, Record<string, number>>) ?? {};
  const pkgCurrencies = (pkgData.currencies as Record<string, Record<string, number>>) ?? {};
  const refundCurrencies = (refundData.currencies as Record<string, Record<string, number>>) ?? {};

  const allCurrencies = new Set([
    ...Object.keys(apptCurrencies),
    ...Object.keys(pkgCurrencies),
    ...Object.keys(refundCurrencies),
  ]);

  const currencies: CurrencySummary[] = [...allCurrencies].map((currency) => {
    const appt = apptCurrencies[currency] ?? {};
    const pkg = pkgCurrencies[currency] ?? {};
    const refund = refundCurrencies[currency] ?? {};
    const paymentsReceived = Number(appt.paid_amount ?? 0) + Number(pkg.paid_amount ?? 0);
    const refunded = Number(refund.refunded_amount ?? 0);

    return {
      currency,
      paymentsReceived,
      refunded,
      netCustomerPayments: paymentsReceived - refunded,
      discountsApplied: Number(appt.discount_amount ?? 0) + Number(pkg.discount_amount ?? 0),
    };
  });

  return {
    currencies,
    totalAppointmentPayments: Number(apptData.count ?? 0),
    totalPackagePurchases: Number(pkgData.count ?? 0),
    totalRefunds: Number(refundData.count ?? 0),
  };
}
