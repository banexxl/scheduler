import "server-only";

/**
 * Unified Appointment Queries — Milestone 9.2.
 *
 * Loads appointments across all linked businesses for
 * the authenticated customer account. Authorization via
 * active tenant links only (never by email alone).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { formatInTimeZone } from "date-fns-tz";
import type { CustomerUnifiedAppointment } from "../types/unified-customer";

/**
 * Loads appointments for a customer account across all
 * actively linked tenants. Sorted by starts_at descending.
 */
export async function getUnifiedAppointments(
  customerAccountId: string,
  filter: "upcoming" | "past" | "cancelled" = "upcoming",
  limit = 25,
  offset = 0
): Promise<CustomerUnifiedAppointment[]> {
  const supabase = createAdminClient();

  // 1. Load active links
  const { data: links } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_account_tenant_links" as never)
    .select("tenant_id, tenant_customer_id" as never)
    .eq("customer_account_id" as never, customerAccountId)
    .eq("link_status" as never, "linked");

  if (!links || (links as unknown[]).length === 0) return [];

  const linkRows = links as unknown as Array<{
    tenant_id: string;
    tenant_customer_id: string;
  }>;

  // 2. Load tenants for names/timezones
  const tenantIds = [...new Set(linkRows.map((l) => l.tenant_id))];
  const { data: tenantRows } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenants" as never)
    .select("id, name, slug, default_timezone" as never)
    .in("id" as never, tenantIds as never);

  const tenantMap = new Map(
    ((tenantRows ?? []) as unknown as Array<{
      id: string; name: string; slug: string; default_timezone: string;
    }>).map((t) => [t.id, t])
  );

  // 3. Query appointments per link
  const customerIds = linkRows.map((l) => l.tenant_customer_id);
  const now = new Date().toISOString();

  let query = (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointments" as never)
    .select(
      "id, tenant_id, customer_id, appointment_number, status, starts_at, ends_at, " +
      "duration_minutes, price, currency, service_name_snapshot, resource_name_snapshot, " +
      "location_name_snapshot" as never
    )
    .in("customer_id" as never, customerIds as never)
    .in("tenant_id" as never, tenantIds as never);

  if (filter === "upcoming") {
    query = query.gte("starts_at" as never, now).not("status" as never, "eq", "cancelled");
    query = query.order("starts_at" as never, { ascending: true });
  } else if (filter === "past") {
    query = query.lt("starts_at" as never, now).not("status" as never, "eq", "cancelled");
    query = query.order("starts_at" as never, { ascending: false });
  } else {
    query = query.eq("status" as never, "cancelled");
    query = query.order("starts_at" as never, { ascending: false });
  }

  const { data: apptRows } = await query.range(offset, offset + limit - 1);

  if (!apptRows) return [];

  // 4. Map to DTOs — verify each appointment belongs to a linked customer
  const linkedCustomerSet = new Set(
    linkRows.map((l) => `${l.tenant_id}:${l.tenant_customer_id}`)
  );

  return ((apptRows as unknown) as Array<Record<string, unknown>>)
    .filter((row) => {
      const key = `${row.tenant_id}:${row.customer_id}`;
      return linkedCustomerSet.has(key);
    })
    .map((row): CustomerUnifiedAppointment => {
      const tenant = tenantMap.get(row.tenant_id as string);
      const tz = tenant?.default_timezone ?? "UTC";

      return {
        tenantSlug: tenant?.slug ?? "",
        tenantName: tenant?.name ?? "Business",
        tenantLogoUrl: null,
        appointmentNumber: row.appointment_number as string,
        status: row.status as string,
        serviceName: row.service_name_snapshot as string,
        resourceName: (row.resource_name_snapshot as string) ?? null,
        locationName: row.location_name_snapshot as string,
        startsAt: row.starts_at as string,
        endsAt: row.ends_at as string,
        localDate: formatInTimeZone(row.starts_at as string, tz, "yyyy-MM-dd"),
        localStartTime: formatInTimeZone(row.starts_at as string, tz, "HH:mm"),
        localEndTime: formatInTimeZone(row.ends_at as string, tz, "HH:mm"),
        durationMinutes: row.duration_minutes as number,
        price: String(row.price),
        currency: row.currency as string,
        canCancel: ["pending", "confirmed"].includes(row.status as string),
        canReschedule: ["pending", "confirmed"].includes(row.status as string),
        canBookAgain: row.status === "completed",
      };
    });
}
