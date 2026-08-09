import "server-only";

/**
 * Customer Query Services — Performance 10.2.
 *
 * Optimized: customer list no longer joins ALL appointments.
 * Uses batched RPC for has-upcoming flag after loading the page.
 * Customer detail uses bounded appointment sub-queries.
 */

import { createClient } from "@/lib/supabase/server";

export type CustomerListFilters = {
     search?: string;
     status?: "active" | "upcoming" | "blocked";
     locationId?: string;
};

export type CustomerListItem = {
     id: string;
     tenantId: string;
     name: string;
     email: string | null;
     phoneNumber: string | null;
     preferredLocationId: string | null;
     marketingOptIn: boolean;
     createdAt: string;
     updatedAt: string;
     isBlocked: boolean;
     blockedReason: string | null;
     loyaltyPoints: number;
     internalNotes: string | null;
     tags: string[];
     hasUpcomingAppointments: boolean;
};

export type CustomerDetail = CustomerListItem & {
     customData: Record<string, unknown>;
     upcomingAppointments: Array<{
          id: string;
          appointmentNumber: string;
          startsAt: string;
          serviceNameSnapshot: string;
          status: string;
     }>;
     recentAppointments: Array<{
          id: string;
          appointmentNumber: string;
          startsAt: string;
          serviceNameSnapshot: string;
          status: string;
     }>;
};

export function parseCustomerTags(value: string | null | undefined): string[] {
     if (!value) return [];

     return value
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
}

export function getCustomerStatusLabel(input: {
     isBlocked: boolean;
     hasUpcomingAppointments: boolean;
}): string {
     if (input.isBlocked) return "Blocked";
     return input.hasUpcomingAppointments ? "Upcoming" : "Active";
}

function mapCustomerRow(row: Record<string, unknown>): CustomerListItem {
     const privateRow = (row.private as Record<string, unknown> | null) ??
          (row.tenant_customer_private as Record<string, unknown> | null) ?? null;
     const tags = parseCustomerTags((privateRow?.custom_data as Record<string, unknown> | null)?.tags as string | null | undefined);

     return {
          id: row.id as string,
          tenantId: row.tenant_id as string,
          name: row.name as string,
          email: (row.email as string | null) ?? null,
          phoneNumber: (row.phone_number as string | null) ?? null,
          preferredLocationId: (row.preferred_location_id as string | null) ?? null,
          marketingOptIn: Boolean(row.marketing_opt_in),
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
          isBlocked: Boolean(privateRow?.is_blocked),
          blockedReason: (privateRow?.blocked_reason as string | null) ?? null,
          loyaltyPoints: Number(privateRow?.loyalty_points ?? 0),
          internalNotes: (privateRow?.internal_notes as string | null) ?? null,
          tags,
          hasUpcomingAppointments: Boolean(row.has_upcoming_appointments),
     };
}

/**
 * List customers with pagination. Does NOT join all appointments.
 * Instead uses a batched RPC to determine upcoming status for the page.
 *
 * Max page size enforced at 100.
 */
export async function getCustomersList(
     tenantId: string,
     filters: CustomerListFilters = {},
     limit = 50,
     offset = 0
): Promise<{ items: CustomerListItem[]; total: number }> {
     const supabase = await createClient();

     // Enforce max page size
     const safLimit = Math.min(Math.max(limit, 1), 100);

     let query = supabase
          .from("tenant_customers")
          .select(
               `id, tenant_id, name, email, phone_number, preferred_location_id, marketing_opt_in, created_at, updated_at,
      tenant_customer_private!left(is_blocked, blocked_reason, loyalty_points, internal_notes, custom_data)`,
               { count: "exact" }
          )
          .eq("tenant_id", tenantId);

     if (filters.search) {
          const search = filters.search.trim();
          if (search.length >= 2) {
               query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`);
          }
     }

     if (filters.locationId) {
          query = query.eq("preferred_location_id", filters.locationId);
     }

     const { data, error, count } = await query
          .order("updated_at", { ascending: false })
          .range(offset, offset + safLimit - 1);

     if (error || !data) return { items: [], total: 0 };

     const rows = data as Array<Record<string, unknown>>;
     const customerIds = rows.map((r) => r.id as string);

     // Batch-determine upcoming appointments for this page of customers
     const upcomingSet = new Set<string>();
     if (customerIds.length > 0) {
          const { data: upcomingRows } = await (supabase as never as Awaited<ReturnType<typeof createClient>>).rpc(
               "get_customers_with_upcoming_flag" as never,
               { p_tenant_id: tenantId, p_customer_ids: customerIds } as never
          );
          if (upcomingRows) {
               for (const r of upcomingRows as unknown as Array<{ customer_id: string; has_upcoming: boolean }>) {
                    if (r.has_upcoming) upcomingSet.add(r.customer_id);
               }
          }
     }

     let items = rows.map((row) =>
          mapCustomerRow({ ...row, has_upcoming_appointments: upcomingSet.has(row.id as string) })
     );

     // Client-side status filter (post-query since it depends on computed flag)
     if (filters.status) {
          items = items.filter((customer) => {
               if (filters.status === "blocked") return customer.isBlocked;
               if (filters.status === "upcoming") return customer.hasUpcomingAppointments;
               return !customer.isBlocked && !customer.hasUpcomingAppointments;
          });
     }

     return { items, total: count ?? items.length };
}

/**
 * Get single customer detail with bounded appointment sub-queries.
 * Loads only 10 upcoming + 10 recent appointments (not entire history).
 */
export async function getCustomerById(
     tenantId: string,
     customerId: string
): Promise<CustomerDetail | null> {
     const supabase = await createClient();

     // Load customer data (without appointments)
     const { data, error } = await supabase
          .from("tenant_customers")
          .select(
               `id, tenant_id, name, email, phone_number, preferred_location_id, marketing_opt_in, created_at, updated_at,
      tenant_customer_private!left(is_blocked, blocked_reason, loyalty_points, internal_notes, custom_data)`
          )
          .eq("tenant_id", tenantId)
          .eq("id", customerId)
          .maybeSingle();

     if (error || !data) return null;

     const row = data as Record<string, unknown>;
     const now = new Date().toISOString();

     // Load bounded upcoming appointments (max 10)
     const { data: upcomingRows } = await supabase
          .from("appointments")
          .select("id, appointment_number, starts_at, service_name_snapshot, status")
          .eq("tenant_id", tenantId)
          .eq("customer_id", customerId)
          .gte("starts_at", now)
          .not("status", "in", "(cancelled,completed,no_show)")
          .order("starts_at", { ascending: true })
          .limit(10);

     // Load bounded recent appointments (max 10)
     const { data: recentRows } = await supabase
          .from("appointments")
          .select("id, appointment_number, starts_at, service_name_snapshot, status")
          .eq("tenant_id", tenantId)
          .eq("customer_id", customerId)
          .order("starts_at", { ascending: false })
          .limit(10);

     const upcomingAppointments = ((upcomingRows ?? []) as Array<Record<string, unknown>>)
          .map((appointment) => ({
               id: appointment.id as string,
               appointmentNumber: appointment.appointment_number as string,
               startsAt: appointment.starts_at as string,
               serviceNameSnapshot: appointment.service_name_snapshot as string,
               status: appointment.status as string,
          }));

     const recentAppointments = ((recentRows ?? []) as Array<Record<string, unknown>>)
          .map((appointment) => ({
               id: appointment.id as string,
               appointmentNumber: appointment.appointment_number as string,
               startsAt: appointment.starts_at as string,
               serviceNameSnapshot: appointment.service_name_snapshot as string,
               status: appointment.status as string,
          }));

     return {
          ...mapCustomerRow({ ...row, has_upcoming_appointments: upcomingAppointments.length > 0 }),
          customData: ((row.tenant_customer_private as Record<string, unknown> | null)?.custom_data as Record<string, unknown> | undefined) ?? {},
          upcomingAppointments,
          recentAppointments,
     };
}
