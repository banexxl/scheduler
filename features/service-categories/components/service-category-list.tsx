"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import NextLink from "next/link";
import type { ServiceCategory } from "../types/service-category";
import { deleteServiceCategoryAction } from "../actions/delete-service-category";
import { toggleServiceCategoryStatusAction } from "../actions/toggle-service-category-status";
import { reorderServiceCategoriesAction } from "../actions/reorder-service-categories";

type Props = { categories: ServiceCategory[]; tenantSlug: string; canEdit: boolean };

export default function ServiceCategoryList({ categories, tenantSlug, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [delDialog, setDelDialog] = useState<{ id: string; name: string } | null>(null);

  const handleAction = (action: () => Promise<{ success: boolean; message?: string }>) => {
    setMenuAnchor(null);
    setMsg(null);
    startTransition(async () => { const r = await action(); setMsg({ type: r.success ? "success" : "error", text: r.message ?? "Done." }); });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const ids = categories.map((c) => c.id);
    [ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!];
    handleAction(() => reorderServiceCategoriesAction(tenantSlug, ids));
  };

  const handleMoveDown = (index: number) => {
    if (index >= categories.length - 1) return;
    const ids = categories.map((c) => c.id);
    [ids[index], ids[index + 1]] = [ids[index + 1]!, ids[index]!];
    handleAction(() => reorderServiceCategoriesAction(tenantSlug, ids));
  };

  if (categories.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary" sx={{ mb: 1 }}>Organize your services into categories.</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>Examples: Hair, Massage, Consultations, Rooms, Rentals.</Typography>
        {canEdit && <Button component={NextLink} href={`/${tenantSlug}/services/categories/new`} variant="contained">Create Category</Button>}
      </Paper>
    );
  }

  return (
    <Box>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      {categories.map((cat, idx) => (
        <Paper key={cat.id} variant="outlined" sx={{ p: 2, mb: 1.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{cat.name}</Typography>
              <Chip label={cat.isActive ? "Active" : "Inactive"} color={cat.isActive ? "success" : "default"} size="small" variant="outlined" />
            </Box>
            {cat.description && <Typography variant="body2" color="text.secondary">{cat.description.length > 100 ? `${cat.description.slice(0, 100)}...` : cat.description}</Typography>}
          </Box>
          {canEdit && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {idx > 0 && <IconButton size="small" onClick={() => handleMoveUp(idx)} disabled={isPending} aria-label="Move up">&#8593;</IconButton>}
              {idx < categories.length - 1 && <IconButton size="small" onClick={() => handleMoveDown(idx)} disabled={isPending} aria-label="Move down">&#8595;</IconButton>}
              <IconButton size="small" onClick={(e) => setMenuAnchor({ el: e.currentTarget, id: cat.id })} disabled={isPending}>&#8942;</IconButton>
              <Menu anchorEl={menuAnchor?.id === cat.id ? menuAnchor.el : null} open={menuAnchor?.id === cat.id} onClose={() => setMenuAnchor(null)}>
                <MenuItem component={NextLink} href={`/${tenantSlug}/services/categories/${cat.id}/edit`} onClick={() => setMenuAnchor(null)}>Edit</MenuItem>
                <MenuItem onClick={() => handleAction(() => toggleServiceCategoryStatusAction(tenantSlug, cat.id, !cat.isActive))}>{cat.isActive ? "Deactivate" : "Activate"}</MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); setDelDialog({ id: cat.id, name: cat.name }); }} sx={{ color: "error.main" }}>Delete</MenuItem>
              </Menu>
            </Box>
          )}
        </Paper>
      ))}
      <Dialog open={!!delDialog} onClose={() => setDelDialog(null)}>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent><DialogContentText>Delete <strong>{delDialog?.name}</strong>? This cannot be undone.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setDelDialog(null)} disabled={isPending}>Cancel</Button>
          <Button color="error" variant="contained" disabled={isPending} onClick={() => { if (delDialog) handleAction(() => deleteServiceCategoryAction(tenantSlug, delDialog.id)); setDelDialog(null); }}>{isPending ? "Deleting..." : "Delete"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
