"use client";

/**
 * Gallery Editor — Milestone 16.4.
 *
 * Upload, reorder, and delete gallery images. Max 12 images.
 * Uploads files to Supabase Storage under {tenantSlug}/gallery/.
 */

import { useState, useRef, useTransition } from "react";
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
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { createClient as createBrowserClient } from "@/lib/supabase/browser";
import {
  addGalleryImage,
  deleteGalleryImage,
  reorderGalleryImages,
} from "../actions/homepage-actions";
import { prepareGalleryUploadAction } from "../actions/gallery-upload-action";
import { HOMEPAGE_LIMITS, type GalleryImage } from "../types";

type Props = {
  tenantSlug: string;
  images: GalleryImage[];
  onChanged: () => void;
};

export default function GalleryEditor({ tenantSlug, images, onChanged }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5 MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setError(null);
    setUploading(true);

    try {
      // 1. Prepare upload path (server validates auth + generates path)
      const prepare = await prepareGalleryUploadAction(
        tenantSlug,
        selectedFile.type,
        selectedFile.size
      );

      console.log("[GalleryEditor] Prepare result:", prepare);

      if (!prepare.success) {
        setError(prepare.message);
        setUploading(false);
        return;
      }

      // 2. Upload to Supabase Storage via browser client
      const supabase = createBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("business-media")
        .upload(prepare.uploadPath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[GalleryEditor] Supabase storage upload error:", {
          message: uploadError.message,
          name: uploadError.name,
          statusCode: (uploadError as unknown as Record<string, unknown>).statusCode,
          error: uploadError,
          uploadPath: prepare.uploadPath,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        });
        setError(`Upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      // 3. Save to gallery table with the public URL
      const result = await addGalleryImage(tenantSlug, {
        imageUrl: prepare.publicUrl,
        altText: altText.trim() || undefined,
      });

      if (!result.success) {
        setError(result.message);
        setUploading(false);
        return;
      }

      // Success — reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setAltText("");
      if (inputRef.current) inputRef.current.value = "";
      onChanged();
    } catch (err) {
      console.error("[GalleryEditor] Unexpected error:", err);
      setError("An unexpected error occurred.");
    }
    setUploading(false);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAltText("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
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
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const newOrder = [...images];
    const a = newOrder[index];
    const b = newOrder[target];
    if (a === undefined || b === undefined) return;
    newOrder[index] = b;
    newOrder[target] = a;
    setError(null);
    startTransition(async () => {
      const r = await reorderGalleryImages(tenantSlug, newOrder.map((img) => img.id));
      if (r.success) onChanged();
      else setError(r.message);
    });
  };

  const atLimit = images.length >= HOMEPAGE_LIMITS.maxGalleryImages;
  const busy = isPending || uploading;

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
                <IconButton size="small" disabled={busy || idx === 0} onClick={() => handleMove(idx, -1)} aria-label="Move left">
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" disabled={busy} onClick={() => handleDelete(img.id)} aria-label="Delete" color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" disabled={busy || idx === images.length - 1} onClick={() => handleMove(idx, 1)} aria-label="Move right">
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Upload new image */}
      {!atLimit && (
        <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 1, p: 2 }}>
          {!selectedFile ? (
            <Box sx={{ textAlign: "center" }}>
              <Button variant="outlined" component="label" disabled={busy}>
                Choose Image
                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                JPEG, PNG, or WebP. Max 5 MB.
              </Typography>
            </Box>
          ) : (
            <Box>
              {previewUrl && (
                <Box sx={{ mb: 2, textAlign: "center" }}>
                  <Box
                    component="img"
                    src={previewUrl}
                    alt="Preview"
                    sx={{ maxWidth: "100%", maxHeight: 200, borderRadius: 1 }}
                  />
                </Box>
              )}
              <TextField
                label="Alt text (optional)"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                fullWidth
                size="small"
                disabled={busy}
                slotProps={{ htmlInput: { maxLength: HOMEPAGE_LIMITS.galleryAltText } }}
                helperText="Describe the image for accessibility"
                sx={{ mb: 1 }}
              />
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button variant="contained" onClick={handleUpload} disabled={busy}>
                  {uploading ? <CircularProgress size={20} /> : "Upload"}
                </Button>
                <Button variant="outlined" onClick={handleCancel} disabled={busy}>
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
