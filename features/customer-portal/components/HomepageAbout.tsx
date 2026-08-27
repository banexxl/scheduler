"use client";

/**
 * Homepage About Section — Milestone 16.4.
 *
 * Renders the about section from tenant_homepage data.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { HomepageContent } from "@/features/homepage-builder/types";

type Props = {
  content: HomepageContent;
};

export default function HomepageAbout({ content }: Props) {
  if (!content.aboutBody && !content.aboutTitle) return null;

  return (
    <Box component="section" aria-labelledby="about-heading" sx={{ maxWidth: 700, mx: "auto", px: 2, py: 5 }}>
      {content.aboutImageUrl && (
        <Box
          component="img"
          src={content.aboutImageUrl}
          alt={content.aboutTitle || "About us"}
          sx={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 2, mb: 3 }}
        />
      )}

      {content.aboutTitle && (
        <Typography id="about-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 2, textAlign: "center" }}>
          {content.aboutTitle}
        </Typography>
      )}

      {content.aboutBody && (
        <Typography sx={{ fontSize: "0.9375rem", color: "text.secondary", whiteSpace: "pre-wrap", lineHeight: 1.7, textAlign: "center" }}>
          {content.aboutBody}
        </Typography>
      )}
    </Box>
  );
}
