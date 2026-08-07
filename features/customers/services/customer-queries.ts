import "server-only";

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
     const privateRow = (row.private as Record<string, unknown> | null) ?? null;
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

export async function getCustomersList(
     tenantId: string,
     filters: CustomerListFilters = {},
     limit = 50,
     offset = 0
): Promise<{ items: CustomerListItem[]; total: number }> {
     const supabase = await createClient();

     let query = supabase
          .from("tenant_customers")
          .select(
               `id, tenant_id, name, email, phone_number, preferred_location_id, marketing_opt_in, created_at, updated_at,
      tenant_customer_private!left(is_blocked, blocked_reason, loyalty_points, internal_notes, custom_data),
      appointments!left(id, starts_at, status)`,
               { count: "exact" }
          )
          .eq("tenant_id", tenantId);

     if (filters.search) {
          const search = filters.search.trim();
          if (search) {
               query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`);
          }
     }

     if (filters.locationId) {
          query = query.eq("preferred_location_id", filters.locationId);
     }

     const { data, error } = await query.order("updated_at", { ascending: false }).range(offset, offset + limit - 1);

     if (error || !data) return { items: [], total: 0 };

     const rows = data as Array<Record<string, unknown>>;
     let items = rows.map((row) => {
          const appointments = (row.appointments as Array<Record<string, unknown>> | null) ?? [];
          const hasUpcomingAppointments = appointments.some((appointment) => {
               const startsAt = appointment.starts_at as string | null;
               const status = appointment.status as string | null;
               if (!startsAt || !status) return false;
               const startsAtDate = new Date(startsAt);
               return status !== "cancelled" && status !== "completed" && startsAtDate.getTime() >= Date.now();
          });

          return mapCustomerRow({ ...row, has_upcoming_appointments: hasUpcomingAppointments });
     });

     if (filters.status) {
          items = items.filter((customer) => {
               if (filters.status === "blocked") return customer.isBlocked;
               if (filters.status === "upcoming") return customer.hasUpcomingAppointments;
               return !customer.isBlocked && !customer.hasUpcomingAppointments;
          });
     }

     return { items, total: items.length };
}

export async function getCustomerById(
     tenantId: string,
     customerId: string
): Promise<CustomerDetail | null> {
     const supabase = await createClient();

     const { data, error } = await supabase
          .from("tenant_customers")
          .select(
               `id, tenant_id, name, email, phone_number, preferred_location_id, marketing_opt_in, created_at, updated_at,
      tenant_customer_private!left(is_blocked, blocked_reason, loyalty_points, internal_notes, custom_data),
      appointments!left(id, appointment_number, starts_at, service_name_snapshot, status)`
          )
          .eq("tenant_id", tenantId)
          .eq("id", customerId)
          .maybeSingle();

     if (error || !data) return null;

     const row = data as Record<string, unknown>;
     const appointments = (row.appointments as Array<Record<string, unknown>> | null) ?? [];
     const upcomingAppointments = appointments
          .filter((appointment) => {
               const startsAt = appointment.starts_at as string | null;
               const status = appointment.status as string | null;
               if (!startsAt || !status) return false;
               const startsAtDate = new Date(startsAt);
               return status !== "cancelled" && status !== "completed" && startsAtDate.getTime() >= Date.now();
          })
          .slice(0, 5)
          .map((appointment) => ({
               id: appointment.id as string,
               appointmentNumber: appointment.appointment_number as string,
               startsAt: appointment.starts_at as string,
               serviceNameSnapshot: appointment.service_name_snapshot as string,
               status: appointment.status as string,
          }));

     const recentAppointments = appointments
          .slice(0, 5)
          .map((appointment) => ({
               id: appointment.id as string,
               appointmentNumber: appointment.appointment_number as string,
               startsAt: appointment.starts_at as string,
               serviceNameSnapshot: appointment.service_name_snapshot as string,
               status: appointment.status as string,
          }));

     return {
          ...mapCustomerRow({ ...row, has_upcoming_appointments: upcomingAppointments.length > 0 }),
          customData: ((row.private as Record<string, unknown> | null)?.custom_data as Record<string, unknown> | undefined) ?? {},
          upcomingAppointments,
          recentAppointments,
     };
}

