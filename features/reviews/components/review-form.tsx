"use client";

/**
 * Public Review Form — Milestone 8.7.
 *
 * Star rating + optional comment submission.
 * Accessible, mobile-first, branded.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { submitReviewAction } from "../actions/submit-review-action";

type Props = {
  token: string;
  tenantSlug: string;
  tenantName: string;
  serviceName: string;
  appointmentDate: string;
  customerName: string;
};

export default function ReviewForm({
  token,
  tenantSlug,
  tenantName,
  serviceName,
  appointmentDate,
  customerName,
}: Props) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (rating < 1 || rating > 5) {
      setError("Please select a rating.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await submitReviewAction(token, {
        rating,
        comment: comment.trim() || null,
      });
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (submitted) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Paper elevation={2} sx={{ p: 4, maxWidth: 420, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={700} color="success.main" gutterBottom>
            Thank you!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your feedback has been submitted. We appreciate you taking the time.
          </Typography>
          <Button component="a" href={`/book/${tenantSlug}`} variant="outlined" size="small">
            Book another appointment
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, maxWidth: 480, width: "100%", borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
          {tenantName}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          How was your <strong>{serviceName}</strong> appointment on {appointmentDate}?
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Star Rating */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Your rating</Typography>
          <Stack direction="row" spacing={1} justifyContent="center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Button
                key={star}
                variant={rating >= star ? "contained" : "outlined"}
                onClick={() => setRating(star)}
                sx={{ minWidth: 48, height: 48, fontSize: "1.5rem" }}
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                aria-pressed={rating >= star}
              >
                ★
              </Button>
            ))}
          </Stack>
          {rating > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {rating} out of 5
            </Typography>
          )}
        </Box>

        {/* Comment */}
        <TextField
          label="Comments (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          fullWidth
          multiline
          rows={3}
          slotProps={{ htmlInput: { maxLength: 2000 } }}
          helperText={`${comment.length}/2000`}
          sx={{ mb: 3 }}
        />

        {/* Submit */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleSubmit}
          disabled={isPending || rating === 0}
        >
          {isPending ? "Submitting..." : "Submit Feedback"}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
          Hi {customerName}, your feedback is appreciated.
        </Typography>
      </Paper>
    </Box>
  );
}
