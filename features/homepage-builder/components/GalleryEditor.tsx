"use client";

/**
 * Gallery Editor — Milestone 16.4.
 *
 * Upload, reorder, and delete gallery images. Max 12 images.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import CardActions from "@mui/material/CardActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  addGalleryImage,
  deleteGalleryImage,
  reorderGalleryImages,
} from "../actions/homepage-actions";
import { HOMEPAGE_LIMITS, type GalleryImage } from "../types";

type Props = {
  tenantSlug: string;
  images: GalleryImage[];
  onChanged: () => void;
};

export default function GalleryEditor({ tenantSlug, images, onChanged }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [newAlt, setNewAlt] = useState("");

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    setError(null);
    startTransition(async () => {
      const r = await addGalleryImage(tenantSlug, { imageUrl: newUrl.trim(), altText: newAlt.trim() || undefined });
      if (r.success) {
        setNewUrl("");
        setNewAlt("");
        onChanged();
      } else {
        setError(r.message);
      }
    });
  };

  const handleDelete = (imageId: string) => {
    setError(null);
    startTransition(async () => {
      const r = await deleteGalleryImage(tenantSlug, imageId);
      if (r.success) onChanged();
      else setError(r.message);
    });
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const newOrder = [...images];
    const target = index + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setError(null);
    startTransition(async () => {
      const r = await reorderGalleryImages(tenantSlug, newOrder.map((img) => img.id));
      if (r.success) onChanged();
      else setError(r.message);
    });
  };

  const atLimit = images.length >= HOMEPAGE_LIMITS.maxGalleryImages;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {images.length}/{HOMEPAGE_LIMITS.maxGalleryImages} images
      </Typography>

      {/* Image grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {images.map((img, idx) => (
          <Grid key={img.id} size={{ xs: 6, sm: 4, md: 3 }}>
            <Card variant="outlined">
              <CardMedia
                component="img"
                height={120}
                image={img.imageUrl}
                alt={img.altText || "Gallery image"}
                sx={{ objectFit: "cover" }}
              />
              <CardActions sx={{ justifyContent: "center", py: 0.5 }}>
                <IconButton size="small" disabled={isPending || idx === 0} onClick={() => handleMove(idx, -1)} aria-label="Move left">
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" disabled={isPending} onClick={() => handleDelete(img.id)} aria-label="Delete" color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" disabled={isPending || idx === images.length - 1} onClick={() => handleMove(idx, 1)} aria-label="Move right">
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add new image */}
      {!atLimit && (
        <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 1, p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Add Image</Typography>
          <TextField
            label="Image URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            fullWidth
            size="small"
            disabled={isPending}
            sx={{ mb: 1 }}
          />
          <TextField
            label="Alt text (optional)"
            value={newAlt}
            onChange={(e) => setNewAlt(e.target.value)}
            fullWidth
            size="small"
            disabled={isPending}
            slotProps={{ htmlInput: { maxLength: HOMEPAGE_LIMITS.galleryAltText } }}
            sx={{ mb: 1 }}
          />
          <Button variant="outlined" size="small" onClick={handleAdd} disabled={isPending || !newUrl.trim()}>
            {isPending ? "Adding..." : "Add Image"}
          </Button>
        </Box>
      )}
    </Box>
  );
}
