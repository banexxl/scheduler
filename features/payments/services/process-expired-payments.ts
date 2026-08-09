import "server-only";

/**
 * Process Expired Appointment Payments — Milestone 11.4.
 *
 * Claims appointments with expired payment deadlines and cancels them.
 * Integrates with waitlist matching and reminder cancellation.
 * Uses FOR UPDATE SKIP LOCKED for concurrency safety.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging";

export type ExpiryProcessResult = {
  claimed: number;
  cancelled: number;
  alreadyPaid: number;
  alreadyExpired: number;
  failed: number;
};

export async function processExpiredAppointmentPayments(): Promise<ExpiryProcessResult> {
  const supabase = createAdminClient();

  // Claim expired payments
  const { data: candidates } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .rpc("claim_expired_appointment_payments" as never, {
      p_batch_size: 50,
      p_worker_id: `expiry_${Date.now()}`,
    } as never);

  if (!candidates || (candidates as unknown as unknown[]).length === 0) {
    return { claimed: 0, cancelled: 0, alreadyPaid: 0, alreadyExpired: 0, failed: 0 };
  }

  const rows = candidates as unknown as Array<{
    appointment_payment_id: string;
    appointment_id: string;
    tenant_id: string;
    payment_intent_id: string | null;
  }>;

  let cancelled = 0;
  let alreadyPaid = 0;
  let alreadyExpired = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const { data: result } = await (supabase as never as ReturnType<typeof createAdminClient>)
        .rpc("cancel_expired_appointment_payment" as never, {
          p_appointment_payment_id: row.appointment_payment_id,
        } as never);

      const rpcResult = (result as unknown as Record<string, unknown>) ?? {};
      const status = String(rpcResult.status ?? "failed");

      if (status === "cancelled") {
        cancelled++;

        // Non-blocking: trigger waitlist matching for freed slot
        try {
          const { triggerWaitlistMatchingForSlot } = await import("@/features/waitlist/services/waitlist-matching");
          const { data: apptRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
            .from("appointments" as never)
            .select("service_id, location_id, resource_id, starts_at, ends_at, tenant_id" as never)
            .eq("id" as never, row.appointment_id)
            .single();

          if (apptRow) {
            const appt = apptRow as unknown as {
              service_id: string; location_id: string; resource_id: string;
              starts_at: string; ends_at: string; tenant_id: string;
            };
            await triggerWaitlistMatchingForSlot({
              tenantId: appt.tenant_id,
              serviceId: appt.service_id,
              locationId: appt.location_id,
              resourceId: appt.resource_id,
              startsAt: appt.starts_at,
              endsAt: appt.ends_at,
              timeZone: "UTC",
            });
          }
        } catch {
          // Waitlist matching failure must never block expiry
        }

        // Non-blocking: cancel pending reminders
        try {
          const { cancelRemindersAfterCancellation } = await import("@/features/notifications/services/reminder-sync-service");
          await cancelRemindersAfterCancellation(row.tenant_id, row.appointment_id);
        } catch {
          // Reminder cancellation failure must never block expiry
        }
      } else if (status === "already_paid") {
        alreadyPaid++;
      } else if (status === "already_expired" || status === "appointment_already_terminal") {
        alreadyExpired++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      logger.error("appointment_payment_expiry_item_failed", {
        tenantId: row.tenant_id,
        appointmentId: row.appointment_id,
      }, error);
    }
  }

  return { claimed: rows.length, cancelled, alreadyPaid, alreadyExpired, failed };
}
