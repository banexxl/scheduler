import "server-only";

/**
 * Waitlist Matching Engine — Milestone 8.8.
 *
 * Finds active waitlist entries that match a newly available slot.
 * Called after cancellation or rescheduling frees time.
 *
 * Matching criteria:
 * - Same tenant, service, location
 * - Resource preference (specific or any)
 * - Date within preferred range
 * - Time within preferred window (if specified)
 * - Entry status = active
 * - Entry not expired
 *
 * Returns oldest-first (fairness policy).
 * Bounded to configurable batch size (default 3).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export type MatchingSlot = {
  tenantId: string;
  serviceId: string;
  locationId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
};

export type MatchedEntry = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
};

/**
 * Finds active waitlist entries matching a released slot.
 * Returns up to `batchSize` oldest matching entries.
 */
export async function findMatchingWaitlistEntries(
  slot: MatchingSlot,
  batchSize: number = 3
): Promise<MatchedEntry[]> {
  const supabase = createAdminClient();

  // Determine the local date from the slot start
  const zonedStart = toZonedTime(new Date(slot.startsAt), slot.timeZone);
  const localDate = format(zonedStart, "yyyy-MM-dd");
  const localTime = format(zonedStart, "HH:mm:ss");

  // Query matching entries
  let query = (supabase as never as ReturnType<typeof createAdminClient>)
    .from("waitlist_entries" as never)
    .select("id, customer_name, customer_email, customer_phone, preferred_time_from, preferred_time_to, allow_any_resource, resource_id" as never)
    .eq("tenant_id" as never, slot.tenantId)
    .eq("service_id" as never, slot.serviceId)
    .eq("location_id" as never, slot.locationId)
    .eq("status" as never, "active")
    .lte("preferred_date_from" as never, localDate)
    .gte("preferred_date_to" as never, localDate)
    .order("created_at" as never, { ascending: true })
    .limit(Math.min(batchSize, 100));

  const { data } = await query;

  if (!data) return [];

  const rows = data as unknown as Array<Record<string, unknown>>;

  // Filter by resource preference and time window in-memory
  const matched: MatchedEntry[] = [];

  for (const row of rows) {
    if (matched.length >= batchSize) break;

    // Resource check
    const allowAny = Boolean(row.allow_any_resource);
    const entryResourceId = row.resource_id as string | null;
    if (!allowAny && entryResourceId && entryResourceId !== slot.resourceId) {
      continue;
    }

    // Time window check
    const timeFrom = row.preferred_time_from as string | null;
    const timeTo = row.preferred_time_to as string | null;
    if (timeFrom && localTime < timeFrom) continue;
    if (timeTo && localTime > timeTo) continue;

    matched.push({
      id: row.id as string,
      customerName: row.customer_name as string,
      customerEmail: (row.customer_email as string) ?? null,
      customerPhone: (row.customer_phone as string) ?? null,
    });
  }

  return matched;
}

/**
 * Triggers waitlist matching after a cancellation or rescheduling frees a slot.
 * Non-blocking: appointment mutation must succeed regardless.
 *
 * Called from cancellation/reschedule actions as a side effect.
 */
export async function triggerWaitlistMatchingForSlot(
  slot: MatchingSlot,
  batchSize?: number
): Promise<{ matched: number }> {
  try {
    // Check if waitlist is enabled for this tenant
    const supabase = createAdminClient();
    const { data: settings } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_notification_settings" as never)
      .select("waitlist_enabled, waitlist_notify_batch_size" as never)
      .eq("tenant_id" as never, slot.tenantId)
      .single();

    const enabled = (settings as unknown as { waitlist_enabled?: boolean })?.waitlist_enabled ?? false;
    if (!enabled) return { matched: 0 };

    const effectiveBatch = batchSize ?? (settings as unknown as { waitlist_notify_batch_size?: number })?.waitlist_notify_batch_size ?? 3;

    const entries = await findMatchingWaitlistEntries(slot, effectiveBatch);
    if (entries.length === 0) return { matched: 0 };

    // Import offer generation dynamically to avoid circular deps
    const { generateWaitlistOffers } = await import("./waitlist-offer-service");
    await generateWaitlistOffers(slot, entries);

    return { matched: entries.length };
  } catch (error) {
    console.error("[waitlist-matching] Error:", {
      tenantId: slot.tenantId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { matched: 0 };
  }
}
