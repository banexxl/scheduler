"use client";

/**
 * Reviews Client Page — Milestone 8.7.
 *
 * Internal reviews management with summary, list, and actions.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { useRouter } from "next/navigation";
import {
  respondToReviewAction,
  moderateReviewAction,
  toggleFeaturedReviewAction,
} from "@/features/reviews/actions/manage-review-actions";
import type { ReviewListItem, ReviewSummary } from "@/features/reviews/types/review";

type Props = {
  tenantSlug: string;
  reviews: ReviewListItem[];
  summary: ReviewSummary;
  canManage: boolean;
};

export default function ReviewsClientPage({ tenantSlug, reviews, summary, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [respondDialogReviewId, setRespondDialogReviewId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  async function handleModerate(reviewId: string, status: "published" | "hidden" | "flagged") {
    const result = await moderateReviewAction(tenantSlug, reviewId, { status });
    if (result.success) {
      setFeedback({ type: "success", msg: "Review updated." });
      startTransition(() => router.refresh());
    } else {
      setFeedback({ type: "error", msg: result.error });
    }
  }

  async function handleToggleFeatured(reviewId: string, featured: boolean) {
    const result = await toggleFeaturedReviewAction(tenantSlug, reviewId, featured);
    if (result.success) startTransition(() => router.refresh());
  }

  async function handleRespond() {
    if (!respondDialogReviewId) return;
    const result = await respondToReviewAction(tenantSlug, respondDialogReviewId, { response: responseText });
    if (result.success) {
      setRespondDialogReviewId(null);
      setResponseText("");
      startTransition(() => router.refresh());
    } else {
      setFeedback({ type: "error", msg: result.error });
    }
  }

  return (
    <Box>
      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.msg}
        </Alert>
      )}

      {/* Summary */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={4} alignItems="center">
          <Box textAlign="center">
            <Typography variant="h3" fontWeight={700}>
              {summary.averageRating ?? "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary">Average</Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight={600}>{summary.totalReviews}</Typography>
            <Typography variant="caption" color="text.secondary">Reviews</Typography>
          </Box>
          <Stack spacing={0.25}>
            {([5, 4, 3, 2, 1] as const).map((r) => (
              <Typography key={r} variant="caption">
                {r}★ — {summary.ratingDistribution[r]}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Typography color="text.secondary">No reviews yet.</Typography>
      ) : (
        <Stack spacing={2}>
          {reviews.map((review) => (
            <Paper key={review.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={700}>{review.rating}★</Typography>
                    <Typography variant="body2">{review.customerNameSnapshot ?? "Customer"}</Typography>
                    <Chip label={review.status} size="small" variant="outlined" />
                    {review.isFeatured && <Chip label="Featured" size="small" color="primary" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {review.serviceNameSnapshot} • {new Date(review.submittedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Stack>

              {review.comment && (
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                  {review.comment}
                </Typography>
              )}

              {review.businessResponse && (
                <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, bgcolor: "grey.50" }}>
                  <Typography variant="caption" fontWeight={600}>Business response:</Typography>
                  <Typography variant="body2">{review.businessResponse}</Typography>
                </Paper>
              )}

              {canManage && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {review.status !== "published" && (
                      <Button size="small" onClick={() => handleModerate(review.id, "published")} disabled={isPending}>Publish</Button>
                    )}
                    {review.status !== "hidden" && (
                      <Button size="small" onClick={() => handleModerate(review.id, "hidden")} disabled={isPending}>Hide</Button>
                    )}
                    {review.status !== "flagged" && (
                      <Button size="small" color="warning" onClick={() => handleModerate(review.id, "flagged")} disabled={isPending}>Flag</Button>
                    )}
                    <Button
                      size="small"
                      onClick={() => handleToggleFeatured(review.id, !review.isFeatured)}
                      disabled={isPending}
                    >
                      {review.isFeatured ? "Unfeature" : "Feature"}
                    </Button>
                    {!review.businessResponse && (
                      <Button size="small" variant="outlined" onClick={() => { setRespondDialogReviewId(review.id); setResponseText(""); }}>
                        Respond
                      </Button>
                    )}
                  </Stack>
                </>
              )}
            </Paper>
          ))}
        </Stack>
      )}

      {/* Respond Dialog */}
      <Dialog open={!!respondDialogReviewId} onClose={() => setRespondDialogReviewId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Respond to Review</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Write your response..."
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRespondDialogReviewId(null)}>Cancel</Button>
          <Button onClick={handleRespond} variant="contained" disabled={!responseText.trim()}>
            Submit Response
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
