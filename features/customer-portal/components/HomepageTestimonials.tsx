"use client";

/**
 * Homepage Testimonials Section — Milestone 16.4.
 *
 * Renders curated testimonials from tenant_testimonials.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Rating from "@mui/material/Rating";
import Avatar from "@mui/material/Avatar";
import type { Testimonial } from "@/features/homepage-builder/types";

type Props = {
  testimonials: Testimonial[];
};

export default function HomepageTestimonials({ testimonials }: Props) {
  if (testimonials.length === 0) return null;

  return (
    <Box component="section" aria-labelledby="testimonials-heading" sx={{ maxWidth: 800, mx: "auto", px: 2, py: 5 }}>
      <Typography id="testimonials-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 3, textAlign: "center" }}>
        What Our Customers Say
      </Typography>

      <Stack spacing={2}>
        {testimonials.map((t) => (
          <Paper key={t.id} variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              {t.avatarUrl ? (
                <Avatar src={t.avatarUrl} alt={t.authorName} sx={{ width: 36, height: 36 }} />
              ) : (
                <Avatar sx={{ width: 36, height: 36, fontSize: "0.875rem", bgcolor: "primary.main" }}>
                  {t.authorName.charAt(0).toUpperCase()}
                </Avatar>
              )}
              <Box>
                <Typography variant="subtitle2">{t.authorName}</Typography>
                <Rating value={t.rating} readOnly size="small" />
              </Box>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {t.body}
            </Typography>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
