"use server";

/**
 * Cancel Series Action — Milestone 15.1.
 *
 * Supports:
 * - Cancel one occurrence (delegates to normal cancelAppointment)
 * - Cancel this and future occurrences
 */

import { revalidatePath } from "next/cache";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import type { CancelScope } from "../types/recurrence";

type CancelSeriesResult =
  | { success: true; cancelledCount: number }
  | { success: false; message: string };

/**
 * Cancels future occurrences of a series from a given occurrence index.
 */
export async function cancelSeriesOccurrencesAction(
  tenantSlug: string,
  seriesId: string,
  fromOccurrenceIndex: number,
  scope: CancelScope,
  reason?: string
): Promise<CancelSeriesResult> {
  const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const log = createServerActionLogger({
    action: "appointment_series.cancel",
    tenantId: tenant.id,
    userId: user.id,
  });

  const supabase = createServiceRoleClient();

  // Verify series belongs to tenant
  const { data: series } = await supabase
    .from("appointment_series")
    .select("id, status")
    .eq("id", seriesId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!series) {
    return { success: false, message: "Series not found." };
  }

  const now = new Date().toISOString();

  if (scope === "this_only") {
    // Cancel single occurrence
    const { data: updated, error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        cancelled_at: now,
        cancelled_by: user.id,
        cancellation_reason: reason ?? "Cancelled from recurring series",
        is_series_exception: true,
      })
      .eq("series_id", seriesId)
      .eq("series_occurrence_index", fromOccurrenceIndex)
      .eq("tenant_id", tenant.id)
      .in("status", ["confirmed", "pending"])
      .select("id");

    if (error) {
      await log.failure(error);
      return { success: false, message: "Unable to cancel occurrence." };
    }

    await log.success({ scope: "this_only", cancelled: updated?.length ?? 0 });
    revalidatePath(`/${tenantSlug}/appointments`);
    return { success: true, cancelledCount: updated?.length ?? 0 };
  }

  // Cancel this and future
  const { data: toCancel, error: fetchError } = await supabase
    .from("appointments")
    .select("id")
    .eq("series_id", seriesId)
    .eq("tenant_id", tenant.id)
    .gte("series_occurrence_index", fromOccurrenceIndex)
    .in("status", ["confirmed", "pending"]);

  if (fetchError) {
    await log.failure(fetchError);
    return { success: false, message: "Unable to load future occurrences." };
  }

  const ids = (toCancel ?? []).map((a) => a.id);
  if (ids.length === 0) {
    return { success: true, cancelledCount: 0 };
  }

  // Batch cancel
  const { error: cancelError } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: now,
      cancelled_by: user.id,
      cancellation_reason: reason ?? "Series cancelled (this and future)",
    })
    .in("id", ids);

  if (cancelError) {
    await log.failure(cancelError);
    return { success: false, message: "Unable to cancel future occurrences." };
  }

  // Update series status if no remaining active future occurrences
  const { data: remaining } = await supabase
    .from("appointments")
    .select("id")
    .eq("series_id", seriesId)
    .eq("tenant_id", tenant.id)
    .in("status", ["confirmed", "pending", "checked_in", "in_progress"])
    .limit(1);

  if (!remaining || remaining.length === 0) {
    await supabase
      .from("appointment_series")
      .update({ status: "cancelled", cancelled_at: now })
      .eq("id", seriesId);
  }

  await log.success({ scope: "this_and_future", cancelled: ids.length });
  revalidatePath(`/${tenantSlug}/appointments`);
  revalidatePath(`/${tenantSlug}/calendar`);

  return { success: true, cancelledCount: ids.length };
}
