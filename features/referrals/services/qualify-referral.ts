import "server-only";

/**
 * Referral Qualification Service — Milestone 15.5.
 *
 * Called after appointment completion to check if a referral should qualify.
 * Non-blocking: failure here must never roll back appointment completion.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging";

/**
 * Attempts to qualify a referral after appointment completion.
 * Safe to call multiple times (idempotent — won't double-qualify).
 */
export async function attemptReferralQualification(
  tenantId: string,
  appointmentId: string,
  customerEmail: string | null
): Promise<void> {
  if (!customerEmail) return;

  try {
    const supabase = createServiceRoleClient();

    // Find an attributed referral for this customer + tenant
    const { data: referral } = await supabase
      .from("customer_referrals")
      .select("id, referrer_customer_id, status")
      .eq("tenant_id", tenantId)
      .eq("referred_customer_email", customerEmail.toLowerCase())
      .eq("status", "attributed")
      .maybeSingle();

    if (!referral) return;

    // Mark as qualified
    const { error } = await supabase
      .from("customer_referrals")
      .update({
        status: "qualified",
        qualified_at: new Date().toISOString(),
        qualifying_appointment_id: appointmentId,
      })
      .eq("id", referral.id)
      .eq("status", "attributed"); // Optimistic lock

    if (error) {
      logger.warn("referral_qualification_failed", {
        tenantId,
        appointmentId,
        operation: "qualify",
      }, error);
    } else {
      logger.info("referral_qualified", {
        tenantId,
        appointmentId,
        operation: "referral.qualify",
      });
    }
  } catch (err) {
    logger.error("referral_qualification_error", {
      tenantId,
      appointmentId,
      operation: "referral.qualify",
    }, err);
  }
}
