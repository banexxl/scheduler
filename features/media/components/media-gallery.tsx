"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import type { MediaAsset } from "../types/media";
import { getMediaPublicUrl } from "../services/get-media-public-url";
import { deleteMediaAssetAction } from "../actions/delete-media-asset";
import { reorderMediaAction } from "../actions/reorder-media";

type MediaGalleryProps = {
  assets: MediaAsset[];
  tenantSlug: string;
  canEdit: boolean;
  onMutate?: () => void;
};

/**
 * Responsive media gallery with delete, reorder, and preview.
 */
export default function MediaGallery({ assets, tenantSlug, canEdit, onMutate }: MediaGalleryProps) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<MediaAsset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  if (assets.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No images uploaded yet.
      </Typography>
    );
  }

  const handleDelete = (asset: MediaAsset) => {
    setDeleteDialog(null);
    setMsg(null);
    startTransition(async () => {
      const r = await deleteMediaAssetAction(tenantSlug, asset.id);
      setMsg({ type: r.success ? "success" : "error", text: r.message ?? "Done." });
      if (r.success) onMutate?.();
    });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const ids = assets.map((a) => a.id);
    [ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!];
    startTransition(async () => {
      const r = await reorderMediaAction(tenantSlug, ids);
      if (r.success) onMutate?.();
      else setMsg({ type: "error", text: r.message ?? "Reorder failed." });
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= assets.length - 1) return;
    const ids = assets.map((a) => a.id);
    [ids[index], ids[index + 1]] = [ids[index + 1]!, ids[index]!];
    startTransition(async () => {
      const r = await reorderMediaAction(tenantSlug, ids);
      if (r.success) onMutate?.();
      else setMsg({ type: "error", text: r.message ?? "Reorder failed." });
    });
  };

  return (
    <Box>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr", md: "1fr 1fr 1fr 1fr" }, gap: 1.5 }}>
        {assets.map((asset, idx) => {
          const url = getMediaPublicUrl(asset.storageBucket, asset.storagePath);
          return (
            <Paper key={asset.id} variant="outlined" sx={{ p: 1, position: "relative" }}>
              <Box
                component="img"
                src={url}
                alt={asset.altText ?? ""}
                sx={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 0.5, cursor: "pointer" }}
                onClick={() => setPreviewAsset(asset)}
              />
              <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                <Chip label={asset.mediaRole} size="small" variant="outlined" />
                {asset.isPrimary && <Chip label="Primary" size="small" color="primary" />}
              </Box>
              {asset.altText && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                  {asset.altText}
                </Typography>
              )}
              {canEdit && (
                <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                  {idx > 0 && <IconButton size="small" onClick={() => handleMoveUp(idx)} disabled={isPending} aria-label="Move up">&#8593;</IconButton>}
                  {idx < assets.length - 1 && <IconButton size="small" onClick={() => handleMoveDown(idx)} disabled={isPending} aria-label="Move down">&#8595;</IconButton>}
                  <IconButton size="small" onClick={() => setDeleteDialog(asset)} disabled={isPending} aria-label="Delete" sx={{ color: "error.main", ml: "auto" }}>&#10005;</IconButton>
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* Preview dialog */}
      <Dialog open={!!previewAsset} onClose={() => setPreviewAsset(null)} maxWidth="md">
        <DialogContent>
          {previewAsset && (
            <Box component="img" src={getMediaPublicUrl(previewAsset.storageBucket, previewAsset.storagePath)} alt={previewAsset.altText ?? ""} sx={{ width: "100%", maxHeight: "80vh", objectFit: "contain" }} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete Image</DialogTitle>
        <DialogContent>
          <Typography>Delete this image? This cannot be undone.</Typography>
          {deleteDialog && (
            <Box component="img" src={getMediaPublicUrl(deleteDialog.storageBucket, deleteDialog.storagePath)} alt="" sx={{ width: 120, mt: 1, borderRadius: 0.5 }} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)} disabled={isPending}>Cancel</Button>
          <Button color="error" variant="contained" disabled={isPending} onClick={() => { if (deleteDialog) handleDelete(deleteDialog); }}>
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
