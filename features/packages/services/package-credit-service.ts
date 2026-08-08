import "server-only";

/**
 * Package Credit Service — Milestone 8.9.
 *
 * Orchestrates credit reservation, consumption, and release
 * through the database RPCs. Called from appointment lifecycle actions.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ─── Reserve Credits ─────────────────────────────────────────────────────────

export type ReserveCreditInput = {
  tenantId: string;
  customerPackageId: string;
  appointmentId: string;
  serviceId: string;
  creditsRequired: number;
};

export type ReserveCreditResult =
  | { success: true; usageId: string }
  | { success: false; error: string };

/**
 * Reserves package credits for an appointment.
 * Uses the concurrency-safe RPC that locks the row.
 */
export async function reservePackageCredits(
  input: ReserveCreditInput
): Promise<ReserveCreditResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .rpc("reserve_customer_package_credits" as never, {
        p_tenant_id: input.tenantId,
        p_customer_package_id: input.customerPackageId,
        p_appointment_id: input.appointmentId,
        p_service_id: input.serviceId,
        p_credits_required: input.creditsRequired,
      } as never);

    if (error) {
      return { success: false, error: error.message };
    }

    const usageId = data as unknown as string;
    return { success: true, usageId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Reserve failed" };
  }
}

// ─── Consume Credits ─────────────────────────────────────────────────────────

/**
 * Marks a reserved usage as consumed (after appointment completion).
 * Idempotent — calling on already-consumed usage is safe.
 */
export async function consumePackageCredits(
  tenantId: string,
  usageId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .rpc("consume_customer_package_usage" as never, {
        p_tenant_id: tenantId,
        p_usage_id: usageId,
      } as never);
  } catch {
    // Non-critical: log but don't fail the completion
    console.error("[package-credit] Consume failed:", { tenantId, usageId });
  }
}

// ─── Release Credits ─────────────────────────────────────────────────────────

/**
 * Releases reserved credits back to the package (after cancellation).
 * Only works on 'reserved' status — consumed credits are not auto-restored.
 */
export async function releasePackageCredits(
  tenantId: string,
  usageId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .rpc("release_customer_package_usage" as never, {
        p_tenant_id: tenantId,
        p_usage_id: usageId,
      } as never);
  } catch {
    console.error("[package-credit] Release failed:", { tenantId, usageId });
  }
}
