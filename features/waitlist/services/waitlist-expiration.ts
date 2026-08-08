import "server-only";

/**
 * Waitlist Expiration Service — Milestone 8.8.
 *
 * Expires old entries and offers that have passed their deadlines.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type ExpirationResult = {
  expiredEntries: number;
  expiredOffers: number;
};

/**
 * Expires waitlist entries whose preferred_date_to has passed
 * and offers whose expires_at has passed.
 */
export async function expireWaitlistItems(): Promise<ExpirationResult> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  // Expire entries where preferred_date_to < today
  const { count: entryCount } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("waitlist_entries" as never)
    .update({ status: "expired" } as never)
    .eq("status" as never, "active")
    .lt("preferred_date_to" as never, today)
    .select("id" as never);

  // Expire pending/notified offers whose expires_at has passed
  const { count: offerCount } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("waitlist_offers" as never)
    .update({ status: "expired" } as never)
    .in("status" as never, ["pending", "notified"] as never)
    .lt("expires_at" as never, now)
    .select("id" as never);

  return {
    expiredEntries: entryCount ?? 0,
    expiredOffers: offerCount ?? 0,
  };
}
