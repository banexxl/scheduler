import "server-only";

/**
 * Appointment Customer Context Service — Milestone 8.3.
 *
 * Loads compact CRM context for a customer linked to an appointment.
 * Used on the appointment detail page to show customer history without
 * duplicating the full CRM view.
 */

import { createClient } from "@/lib/supabase/server";

export type AppointmentCustomerContext = {
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  tags: string[];
  isBlocked: boolean;
  blockedReason: string | null;
  totalAppointments: number;
  noShowCount: number;
  cancelledCount: number;
  lastAppointmentAt: string | null;
  customerProfileUrl: string | null;
};

/**
 * Loads customer context for an appointment.
 * If customerId is available, loads from tenant_customers.
 * Falls back to aggregating appointment data by customer email.
 */
export async function getAppointmentCustomerContext(
  tenantId: string,
  tenantSlug: string,
  appointment: {
    customerId: string | null;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
  }
): Promise<AppointmentCustomerContext> {
  const supabase = await createClient();

  // If we have a customer ID, load from the customers table
  if (appointment.customerId) {
    try {
      const { data: customerData } = await supabase
        .from("tenant_customers")
        .select("id, name, email, phone_number, tenant_customer_private!left(is_blocked, blocked_reason, custom_data)")
        .eq("tenant_id", tenantId)
        .eq("id", appointment.customerId)
        .single();

      if (customerData) {
        const row = customerData as Record<string, unknown>;
        const privateData = (row.tenant_customer_private as Record<string, unknown> | null) ?? null;
        const customData = (privateData?.custom_data as Record<string, unknown> | null) ?? null;
        const tags = parseTags(customData?.tags as string | null);
        const isBlocked = Boolean(privateData?.is_blocked);
        const blockedReason = (privateData?.blocked_reason as string | null) ?? null;

        // Load appointment stats for this customer
        const stats = await getCustomerAppointmentStats(supabase, tenantId, appointment.customerId);

        return {
          customerId: appointment.customerId,
          customerName: row.name as string,
          customerEmail: (row.email as string | null) ?? appointment.customerEmail,
          customerPhone: (row.phone_number as string | null) ?? appointment.customerPhone,
          tags,
          isBlocked,
          blockedReason,
          totalAppointments: stats.total,
          noShowCount: stats.noShow,
          cancelledCount: stats.cancelled,
          lastAppointmentAt: stats.lastAt,
          customerProfileUrl: `/${tenantSlug}/customers/${appointment.customerId}`,
        };
      }
    } catch {
      // Fall through to email-based lookup
    }
  }

  // Fallback: aggregate stats from appointments by email (no customer record)
  if (appointment.customerEmail) {
    const stats = await getCustomerAppointmentStatsByEmail(
      supabase, tenantId, appointment.customerEmail
    );

    return {
      customerId: appointment.customerId,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      tags: [],
      isBlocked: false,
      blockedReason: null,
      totalAppointments: stats.total,
      noShowCount: stats.noShow,
      cancelledCount: stats.cancelled,
      lastAppointmentAt: stats.lastAt,
      customerProfileUrl: appointment.customerId
        ? `/${tenantSlug}/customers/${appointment.customerId}`
        : null,
    };
  }

  // No customer ID and no email — minimal context
  return {
    customerId: appointment.customerId,
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    tags: [],
    isBlocked: false,
    blockedReason: null,
    totalAppointments: 0,
    noShowCount: 0,
    cancelledCount: 0,
    lastAppointmentAt: null,
    customerProfileUrl: null,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTags(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((t) => t.trim()).filter(Boolean);
}

type AppointmentStats = {
  total: number;
  noShow: number;
  cancelled: number;
  lastAt: string | null;
};

async function getCustomerAppointmentStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  customerId: string
): Promise<AppointmentStats> {
  const { data } = await supabase
    .from("appointments")
    .select("id, status, starts_at")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .order("starts_at", { ascending: false })
    .limit(200);

  if (!data) return { total: 0, noShow: 0, cancelled: 0, lastAt: null };

  const rows = data as Array<{ id: string; status: string; starts_at: string }>;
  return {
    total: rows.length,
    noShow: rows.filter((r) => r.status === "no_show").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
    lastAt: rows.length > 0 ? rows[0]!.starts_at : null,
  };
}

async function getCustomerAppointmentStatsByEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  email: string
): Promise<AppointmentStats> {
  const { data } = await supabase
    .from("appointments")
    .select("id, status, starts_at")
    .eq("tenant_id", tenantId)
    .eq("customer_email", email)
    .order("starts_at", { ascending: false })
    .limit(200);

  if (!data) return { total: 0, noShow: 0, cancelled: 0, lastAt: null };

  const rows = data as Array<{ id: string; status: string; starts_at: string }>;
  return {
    total: rows.length,
    noShow: rows.filter((r) => r.status === "no_show").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
    lastAt: rows.length > 0 ? rows[0]!.starts_at : null,
  };
}
