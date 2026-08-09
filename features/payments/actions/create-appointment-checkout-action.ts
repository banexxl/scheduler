"use server";

/**
 * Create Appointment Checkout Action — Milestone 11.2.
 *
 * Server action for initiating a Polar checkout for an appointment.
 * Can be called from:
 *   - Customer account (linked)
 *   - Customer portal (magic-link session)
 *   - Post-booking confirmation
 *
 * Amount is NEVER accepted from the client. It comes from the
 * server-side appointment_payments snapshot.
 */

import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAppointmentCheckout } from "../services/create-appointment-checkout";
import type { CreateAppointmentCheckoutResult } from "../services/create-appointment-checkout";

/**
 * Creates a Polar checkout for a payment-required appointment.
 *
 * Input: only identifiers (appointmentId, tenantSlug).
 * Amount comes from server-side payment record.
 */
export async function createAppointmentCheckoutAction(
  tenantSlug: string,
  appointmentId: string
): Promise<CreateAppointmentCheckoutResult> {
  try {
    const user = await requireUser();

    const supabase = createAdminClient();

    // Resolve tenant
    const { data: tenantRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenants" as never)
      .select("id, name, slug" as never)
      .eq("slug" as never, tenantSlug)
      .single();

    if (!tenantRow) {
      return { success: false, error: "Business not found.", code: "NOT_FOUND" };
    }

    const tenant = tenantRow as unknown as { id: string; name: string; slug: string };

    // Verify the user has access to this appointment
    // (customer account with active link, or tenant member)
    const { data: linkRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("customer_account_tenant_links" as never)
      .select("tenant_customer_id" as never)
      .eq("tenant_id" as never, tenant.id)
      .eq("link_status" as never, "linked")
      .eq("customer_account_id" as never,
        // Get customer account by user_id
        (await (supabase as never as ReturnType<typeof createAdminClient>)
          .from("customer_accounts" as never)
          .select("id" as never)
          .eq("user_id" as never, user.id)
          .single()
          .then(r => (r.data as unknown as { id: string } | null)?.id ?? "none"))
      )
      .maybeSingle();

    // Also check tenant membership (business user paying on behalf)
    const { data: memberRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_members" as never)
      .select("id" as never)
      .eq("tenant_id" as never, tenant.id)
      .eq("user_id" as never, user.id)
      .eq("status" as never, "active")
      .maybeSingle();

    if (!linkRow && !memberRow) {
      return { success: false, error: "Access denied.", code: "UNAUTHORIZED" };
    }

    return await createAppointmentCheckout({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      appointmentId,
      customerEmail: user.email ?? null,
      customerName: null,
      businessName: tenant.name,
    });
  } catch {
    return { success: false, error: "Something went wrong. Please try again.", code: "INTERNAL" };
  }
}
