"use client";

import { useState, useRef, useTransition } from "react";
import toast from "react-hot-toast";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { createClient as createBrowserClient } from "@/lib/supabase/browser";
import { validateMediaFile } from "../utils/validate-media-file";
import { readImageDimensions } from "../utils/read-image-dimensions";
import { prepareMediaUploadAction } from "../actions/prepare-media-upload";
import { completeMediaUploadAction } from "../actions/complete-media-upload";
import type { MediaRole, MediaTarget } from "../types/media";

type MediaUploaderProps = {
  tenantSlug: string;
  target: MediaTarget;
  targetId: string | null;
  mediaRole: MediaRole;
  onUploadComplete?: () => void;
  label?: string;
};

/**
 * Reusable media upload component.
 * Handles file selection, validation, Storage upload, and metadata creation.
 */
export default function MediaUploader({
  tenantSlug,
  target,
  targetId,
  mediaRole,
  onUploadComplete,
  label = "Upload Image",
}: MediaUploaderProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [altText, setAltText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateMediaFile(file, mediaRole);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid file.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // For logos, validate dimensions (max 200×200)
    if (mediaRole === "logo") {
      readImageDimensions(file).then((dims) => {
        if (dims && (dims.width > 200 || dims.height > 200)) {
          setError(`Logo must be 200×200 pixels or smaller. Your image is ${dims.width}×${dims.height}.`);
          setSelectedFile(null);
          setPreviewUrl(null);
          if (inputRef.current) inputRef.current.value = "";
          return;
        }
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        // 1. Prepare upload (server authorization + path generation)
        const prepare = await prepareMediaUploadAction(
          tenantSlug, target, targetId, mediaRole, selectedFile.type, selectedFile.size
        );
        if (!prepare.success || !prepare.uploadPath) {
          setError(prepare.message ?? "Upload preparation failed.");
          toast.error(prepare.message ?? "Upload preparation failed.");
          return;
        }

        // 2. Read dimensions
        const dims = await readImageDimensions(selectedFile);

        // 3. Upload to Supabase Storage via browser client
        const supabase = createBrowserClient();
        const { error: uploadError } = await supabase.storage
          .from("business-media")
          .upload(prepare.uploadPath, selectedFile, {
            contentType: selectedFile.type,
            upsert: false,
          });

        if (uploadError) {
          setError("Upload failed. Please try again.");
          toast.error("Upload failed. Please try again.");
          return;
        }

        // 4. Complete upload (server records metadata)
        const complete = await completeMediaUploadAction(tenantSlug, {
          target,
          targetId,
          mediaRole,
          storagePath: prepare.uploadPath,
          originalFilename: selectedFile.name,
          mimeType: selectedFile.type,
          sizeBytes: selectedFile.size,
          width: dims?.width ?? null,
          height: dims?.height ?? null,
          altText: altText.trim() || null,
        });

        if (!complete.success) {
          setError(complete.message ?? "Failed to save media metadata.");
          toast.error(complete.message ?? "Failed to save media metadata.");
          return;
        }

        setSuccess(true);
        toast.success("File uploaded!");
        setSelectedFile(null);
        setPreviewUrl(null);
        setAltText("");
        if (inputRef.current) inputRef.current.value = "";
        onUploadComplete?.();
      } catch {
        setError("An unexpected error occurred.");
        toast.error("An unexpected error occurred.");
      }
    });
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAltText("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 1, p: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 1 }}>Image uploaded successfully.</Alert>}

      {!selectedFile ? (
        <Box sx={{ textAlign: "center" }}>
          <Button variant="outlined" component="label" disabled={isPending}>
            {label}
            <input ref={inputRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} />
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            JPEG, PNG, or WebP. Max {mediaRole === "logo" ? "2" : "5"} MB.
          </Typography>
        </Box>
      ) : (
        <Box>
          {previewUrl && (
            <Box sx={{ mb: 2, textAlign: "center" }}>
              <Box component="img" src={previewUrl} alt="Preview" sx={{ maxWidth: "100%", maxHeight: 200, borderRadius: 1 }} />
            </Box>
          )}
          <TextField
            label="Alt text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            fullWidth
            size="small"
            margin="dense"
            disabled={isPending}
            slotProps={{ htmlInput: { maxLength: 250 } }}
            helperText="Describe the image for accessibility"
          />
          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <Button variant="contained" onClick={handleUpload} disabled={isPending}>
              {isPending ? <CircularProgress size={20} /> : "Upload"}
            </Button>
            <Button variant="outlined" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
