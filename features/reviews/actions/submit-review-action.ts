"use server";

/**
 * Submit Review Action — Milestone 8.7.
 *
 * Public action (no authentication). Validates token server-side.
 */

import { submitCustomerReview } from "../services/review-submission-service";
import type { SubmitReviewInput } from "../types/review";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function submitReviewAction(
  token: string,
  input: SubmitReviewInput
): Promise<ActionResult> {
  const result = await submitCustomerReview(token, input);

  if (result.success) {
    return { success: true };
  }

  return { success: false, error: result.error };
}
