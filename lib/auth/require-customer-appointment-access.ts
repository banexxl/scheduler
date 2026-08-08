import "server-only";

import { notFound } from "next/navigation";
import { requireCustomerAccount, type CustomerAccountContext } from "./require-customer-account";
import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerAppointmentAccessContext = CustomerAccountContext & {
  appointmentId: string;
  tenantId: string;
};

/**
 * Verifies the authenticated customer account has access to a specific appointment.
 *
 * Authorization chain:
 *   auth.uid() → customer_accounts → customer_account_tenant_links (linked)
 *   → tenant_customers → appointments.customer_id
 *
 * Prevents IDOR: changing an appointment ID in the URL cannot expose
 * another customer's data.
 *
 * Calls notFound() when access is denied (does not reveal existence).
 */
export async function requireCustomerAppointmentAccess(
  appointmentId: string
): Promise<CustomerAppointmentAccessContext> {
  const ctx = await requireCustomerAccount();

  const supabase = createAdminClient();

  // Load appointment with its tenant and customer
  const { data: apptRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointments" as never)
    .select("id, tenant_id, customer_id" as never)
    .eq("id" as never, appointmentId)
    .single();

  if (!apptRow) {
    notFound();
  }

  const appt = apptRow as unknown as { id: string; tenant_id: string; customer_id: string | null };

  if (!appt.customer_id) {
    notFound();
  }

  // Verify the customer account has an active link to this tenant
  const { data: linkRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_account_tenant_links" as never)
    .select("tenant_customer_id" as never)
    .eq("customer_account_id" as never, ctx.account.id)
    .eq("tenant_id" as never, appt.tenant_id)
    .eq("link_status" as never, "linked")
    .single();

  if (!linkRow) {
    notFound();
  }

  const link = linkRow as unknown as { tenant_customer_id: string };

  // Verify the linked tenant_customer matches the appointment's customer_id
  if (link.tenant_customer_id !== appt.customer_id) {
    notFound();
  }

  return {
    ...ctx,
    appointmentId: appt.id,
    tenantId: appt.tenant_id,
  };
}
