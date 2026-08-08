import "server-only";

/**
 * Review Submission Service — Milestone 8.7.
 *
 * Handles the creation of customer reviews after token validation.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveReviewToken, markReviewTokenUsed } from "./review-token-service";
import type { SubmitReviewInput } from "../types/review";

type SubmissionResult =
  | { success: true; reviewId: string }
  | { success: false; error: string; code: string };

/**
 * Submits a customer review for a completed appointment.
 *
 * 1. Validates token (exists, not used/expired/revoked)
 * 2. Verifies appointment is completed
 * 3. Verifies no existing review (unique constraint)
 * 4. Inserts review with snapshots
 * 5. Marks token used
 */
export async function submitCustomerReview(
  rawToken: string,
  input: SubmitReviewInput
): Promise<SubmissionResult> {
  // Validate rating
  if (!input.rating || input.rating < 1 || input.rating > 5 || !Number.isInteger(input.rating)) {
    return { success: false, error: "Rating must be between 1 and 5.", code: "INVALID_RATING" };
  }

  // Validate comment length
  if (input.comment && input.comment.length > 2000) {
    return { success: false, error: "Comment must be 2000 characters or fewer.", code: "COMMENT_TOO_LONG" };
  }

  // Resolve token
  const context = await resolveReviewToken(rawToken);
  if (!context) {
    return { success: false, error: "This review link is invalid or has expired.", code: "TOKEN_INVALID" };
  }

  if (context.hasExistingReview) {
    return { success: false, error: "You have already submitted feedback for this appointment.", code: "ALREADY_REVIEWED" };
  }

  // Load appointment details for snapshots
  const supabase = createAdminClient();
  const { data: apptRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointments")
    .select("customer_id, customer_name, service_id, resource_id, location_id, service_name_snapshot, resource_name_snapshot" as never)
    .eq("id" as never, context.appointmentId)
    .eq("tenant_id" as never, context.tenantId)
    .single();

  if (!apptRow) {
    return { success: false, error: "Appointment not found.", code: "NOT_FOUND" };
  }

  const appt = apptRow as unknown as {
    customer_id: string | null;
    customer_name: string;
    service_id: string;
    resource_id: string;
    location_id: string;
    service_name_snapshot: string;
    resource_name_snapshot: string;
  };

  // Insert review
  const { data: reviewRow, error: insertError } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_reviews" as never)
    .insert({
      tenant_id: context.tenantId,
      appointment_id: context.appointmentId,
      customer_id: appt.customer_id,
      service_id: appt.service_id,
      resource_id: appt.resource_id,
      location_id: appt.location_id,
      rating: input.rating,
      comment: input.comment?.trim() || null,
      status: "published",
      service_name_snapshot: appt.service_name_snapshot,
      resource_name_snapshot: appt.resource_name_snapshot,
      customer_name_snapshot: appt.customer_name,
    } as never)
    .select("id")
    .single();

  if (insertError) {
    // Unique constraint violation = already reviewed
    if (insertError.message?.includes("unique") || insertError.message?.includes("duplicate")) {
      return { success: false, error: "Feedback already submitted.", code: "ALREADY_REVIEWED" };
    }
    return { success: false, error: "Unable to submit feedback.", code: "INSERT_FAILED" };
  }

  // Mark token used
  await markReviewTokenUsed(context.tokenId);

  return { success: true, reviewId: (reviewRow as unknown as { id: string }).id };
}
