"use client";

/**
 * Public Reviews Summary — Milestone 8.7.
 *
 * Compact review summary shown on the public booking page
 * when show_public_reviews is enabled.
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import type { PublicReview, ReviewSummary } from "../types/review";

type Props = {
  summary: ReviewSummary;
  reviews: PublicReview[];
};

export default function PublicReviewsSummary({ summary, reviews }: Props) {
  if (summary.totalReviews === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: reviews.length > 0 ? 2 : 0 }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">
          {summary.averageRating} ★
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Based on {summary.totalReviews} review{summary.totalReviews !== 1 ? "s" : ""}
        </Typography>
      </Stack>

      {reviews.length > 0 && (
        <Stack spacing={1.5}>
          {reviews.slice(0, 3).map((review, i) => (
            <Box key={i} sx={{ borderTop: i > 0 ? "1px solid" : "none", borderColor: "divider", pt: i > 0 ? 1.5 : 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight={600}>{review.rating}★</Typography>
                <Typography variant="caption" color="text.secondary">
                  {review.customerDisplayName}
                  {review.serviceName && ` • ${review.serviceName}`}
                </Typography>
              </Stack>
              {review.comment && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {review.comment}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
