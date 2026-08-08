import "server-only";

/**
 * Loyalty Award Service — Milestone 8.10.
 *
 * Awards loyalty points after appointment completion.
 * Non-blocking, idempotent, concurrency-safe via RPC.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { TenantLoyaltySettings } from "../types/loyalty";
import type { Appointment } from "@/features/appointments/types/appointment";

// ─── Resolve Settings ────────────────────────────────────────────────────────

export async function getLoyaltySettings(tenantId: string): Promise<TenantLoyaltySettings> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_loyalty_settings" as never)
    .select("is_enabled, points_per_completed_appointment, count_completed_visits, allow_manual_adjustments" as never)
    .eq("tenant_id" as never, tenantId)
    .single();

  if (!data) {
    return { isEnabled: false, pointsPerCompletedAppointment: 0, countCompletedVisits: true, allowManualAdjustments: true };
  }

  const row = data as unknown as Record<string, unknown>;
  return {
    isEnabled: Boolean(row.is_enabled),
    pointsPerCompletedAppointment: (row.points_per_completed_appointment as number) ?? 0,
    countCompletedVisits: Boolean(row.count_completed_visits),
    allowManualAdjustments: Boolean(row.allow_manual_adjustments),
  };
}

// ─── Award on Completion ─────────────────────────────────────────────────────

/**
 * Awards loyalty points for a completed appointment.
 * Called as non-blocking side effect from status transition.
 *
 * Requirements:
 * - Loyalty enabled
 * - Points > 0
 * - Appointment has customer_id
 * - Idempotent (same appointment never awards twice)
 */
export async function awardLoyaltyForCompletedAppointment(
  tenantId: string,
  appointment: Appointment
): Promise<void> {
  try {
    if (appointment.status !== "completed") return;
    if (!appointment.customerId) return;

    const settings = await getLoyaltySettings(tenantId);
    if (!settings.isEnabled) return;
    if (settings.pointsPerCompletedAppointment <= 0) return;

    const supabase = createAdminClient();
    const idempotencyKey = `appointment:${appointment.id}:loyalty-earned`;

    await (supabase as never as ReturnType<typeof createAdminClient>)
      .rpc("award_customer_loyalty_points" as never, {
        p_tenant_id: tenantId,
        p_customer_id: appointment.customerId,
        p_appointment_id: appointment.id,
        p_points: settings.pointsPerCompletedAppointment,
        p_count_visit: settings.countCompletedVisits,
        p_idempotency_key: idempotencyKey,
      } as never);
  } catch (error) {
    // Non-blocking: never fail appointment completion
    console.error("[loyalty-award] Error:", {
      tenantId,
      appointmentId: appointment.id,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
