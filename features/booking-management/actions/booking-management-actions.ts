"use server";

/**
 * Booking Management Server Actions — Milestone 18.0.
 *
 * Secure booking lookup and retrieval.
 * Access requires: tenant slug + booking reference + matching email.
 * Never reveals whether a reference exists on failure.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { BookingDetails } from "../types";

// ─── Find Booking By Reference ───────────────────────────────────────────────

export type FindBookingResult =
  | { success: true; reference: string }
  | { success: false; error: string };

/**
 * Validates booking reference + email combination.
 * Returns the reference on success for redirect.
 * Generic error message on failure — never reveals if reference exists.
 */
export async function findBookingByReference(
  tenantSlug: string,
  reference: string,
  email: string
): Promise<FindBookingResult> {
  if (!reference.trim() || !email.trim()) {
    return { success: false, error: "Please enter your booking reference and email." };
  }

  const supabase = createServiceRoleClient();

  // Resolve tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (!tenant) {
    return { success: false, error: "Booking not found. Please check your details and try again." };
  }

  // Find appointment by reference + email
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, appointment_number, customer_email")
    .eq("tenant_id", tenant.id)
    .eq("appointment_number", reference.trim().toUpperCase())
    .maybeSingle();

  if (!appointment) {
    return { success: false, error: "Booking not found. Please check your details and try again." };
  }

  const row = appointment as unknown as {
    id: string;
    appointment_number: string;
    customer_email: string | null;
  };

  // Verify email matches (case-insensitive)
  if (!row.customer_email || row.customer_email.toLowerCase() !== email.trim().toLowerCase()) {
    return { success: false, error: "Booking not found. Please check your details and try again." };
  }

  return { success: true, reference: row.appointment_number };
}

// ─── Get Booking Details ─────────────────────────────────────────────────────

export type GetBookingDetailsResult =
  | { success: true; booking: BookingDetails }
  | { success: false; error: string };

/**
 * Loads full booking details for display.
 * Requires tenant slug + reference + email for security.
 */
export async function getBookingDetails(
  tenantSlug: string,
  reference: string,
  email: string
): Promise<GetBookingDetailsResult> {
  const supabase = createServiceRoleClient();

  // Resolve tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", tenantSlug)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (!tenant) {
    return { success: false, error: "Booking not found." };
  }

  // Load appointment with all details
  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "id, appointment_number, status, customer_name, customer_email, customer_phone, " +
      "starts_at, ends_at, duration_minutes, price, currency, " +
      "service_name_snapshot, location_name_snapshot, resource_name_snapshot, " +
      "customer_notes, created_at, checked_in_at, completed_at, cancelled_at, " +
      "cancellation_reason, no_show_at"
    )
    .eq("tenant_id", tenant.id)
    .eq("appointment_number", reference.trim().toUpperCase())
    .maybeSingle();

  if (!appointment) {
    return { success: false, error: "Booking not found." };
  }

  const row = appointment as unknown as {
    id: string;
    appointment_number: string;
    status: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    starts_at: string;
    ends_at: string;
    duration_minutes: number;
    price: string;
    currency: string;
    service_name_snapshot: string;
    location_name_snapshot: string;
    resource_name_snapshot: string;
    customer_notes: string | null;
    created_at: string;
    checked_in_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    no_show_at: string | null;
  };

  // Verify email
  if (!row.customer_email || row.customer_email.toLowerCase() !== email.trim().toLowerCase()) {
    return { success: false, error: "Booking not found." };
  }

  const booking: BookingDetails = {
    id: row.id,
    reference: row.appointment_number,
    status: row.status as BookingDetails["status"],
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
    },
    service: { name: row.service_name_snapshot },
    staff: row.resource_name_snapshot ? { name: row.resource_name_snapshot } : null,
    location: { name: row.location_name_snapshot },
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    durationMinutes: row.duration_minutes,
    price: row.price,
    currency: row.currency,
    notes: row.customer_notes,
    tenantName: tenant.name,
    createdAt: row.created_at,
    confirmedAt: row.created_at, // Confirmed at creation for online bookings
    checkedInAt: row.checked_in_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    noShowAt: row.no_show_at,
  };

  return { success: true, booking };
}
