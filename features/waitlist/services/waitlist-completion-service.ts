import "server-only";

/**
 * Waitlist Completion Service — Milestone 8.8.
 *
 * After a successful appointment booking that originated from a waitlist offer:
 * 1. Marks the used offer as `accepted`
 * 2. Marks the related waitlist entry as `booked`
 * 3. Cancels all other pending/notified offers for that entry
 *
 * This is called from trusted server-side code only, never from client input.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type CompleteWaitlistBookingInput = {
  tenantId: string;
  offerId: string;
  waitlistEntryId: string;
};

/**
 * Completes the waitlist flow after a successful appointment booking.
 * Non-blocking: failures here should not rollback the appointment.
 */
export async function completeWaitlistBooking(
  input: CompleteWaitlistBookingInput
): Promise<{ success: boolean }> {
  try {
    const supabase = createAdminClient();

    // 1. Mark the specific offer as accepted
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("waitlist_offers" as never)
      .update({ status: "accepted" } as never)
      .eq("id" as never, input.offerId)
      .eq("tenant_id" as never, input.tenantId);

    // 2. Mark the waitlist entry as booked
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("waitlist_entries" as never)
      .update({ status: "booked" } as never)
      .eq("id" as never, input.waitlistEntryId)
      .eq("tenant_id" as never, input.tenantId);

    // 3. Cancel all other pending/notified offers for this entry
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("waitlist_offers" as never)
      .update({ status: "cancelled" } as never)
      .eq("waitlist_entry_id" as never, input.waitlistEntryId)
      .eq("tenant_id" as never, input.tenantId)
      .in("status" as never, ["pending", "notified"] as never)
      .neq("id" as never, input.offerId);

    return { success: true };
  } catch (error) {
    console.error("[waitlist-completion] Error:", {
      offerId: input.offerId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { success: false };
  }
}

/**
 * Marks an offer as stale when the slot is no longer available.
 */
export async function markOfferStale(
  tenantId: string,
  offerId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("waitlist_offers" as never)
      .update({ status: "stale" } as never)
      .eq("id" as never, offerId)
      .eq("tenant_id" as never, tenantId)
      .in("status" as never, ["pending", "notified"] as never);
  } catch {
    // Non-critical
  }
}

/**
 * Validates a waitlist offer token for booking eligibility.
 * Returns the offer context if valid, null otherwise.
 */
export async function validateWaitlistOfferForBooking(
  tokenHash: string
): Promise<{
  offerId: string;
  tenantId: string;
  waitlistEntryId: string;
  serviceId: string;
  locationId: string;
  resourceId: string;
  startsAt: string;
} | null> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("waitlist_offers" as never)
    .select("id, tenant_id, waitlist_entry_id, service_id, location_id, resource_id, starts_at, status, expires_at" as never)
    .eq("token_hash" as never, tokenHash)
    .single();

  if (!data) return null;

  const offer = data as unknown as {
    id: string; tenant_id: string; waitlist_entry_id: string;
    service_id: string; location_id: string; resource_id: string;
    starts_at: string; status: string; expires_at: string;
  };

  // Must be pending or notified
  if (!["pending", "notified"].includes(offer.status)) return null;

  // Must not be expired
  if (new Date(offer.expires_at) <= new Date()) return null;

  return {
    offerId: offer.id,
    tenantId: offer.tenant_id,
    waitlistEntryId: offer.waitlist_entry_id,
    serviceId: offer.service_id,
    locationId: offer.location_id,
    resourceId: offer.resource_id,
    startsAt: offer.starts_at,
  };
}
