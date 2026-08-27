"use client";

/**
 * Homepage Gallery Section — Milestone 16.4.
 *
 * Renders gallery images from tenant_gallery_images.
 */

import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { GalleryImage } from "@/features/homepage-builder/types";

type Props = {
  images: GalleryImage[];
};

export default function HomepageGallery({ images }: Props) {
  if (images.length === 0) return null;

  return (
    <Box component="section" aria-labelledby="gallery-heading" sx={{ maxWidth: 900, mx: "auto", px: 2, py: 5 }}>
      <Typography id="gallery-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 3, textAlign: "center" }}>
        Gallery
      </Typography>
      <Grid container spacing={1}>
        {images.map((img) => (
          <Grid key={img.id} size={{ xs: 6, sm: 4, md: 3 }}>
            <Box
              component="img"
              src={img.imageUrl}
              alt={img.altText || "Gallery image"}
              loading="lazy"
              sx={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 1, display: "block" }}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
