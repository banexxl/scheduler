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
import type { ResourceType } from "../types/resource";
import { RESOURCE_KIND_LABELS } from "../types/resource";
import { deleteResourceTypeAction } from "../actions/delete-resource-type";

type Props = { types: ResourceType[]; tenantSlug: string; canEdit: boolean; resourceCounts: Record<string, number> };

export default function ResourceTypeList({ types, tenantSlug, canEdit, resourceCounts }: Props) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [delDialog, setDelDialog] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (id: string) => {
    setDelDialog(null);
    setMsg(null);
    startTransition(async () => { const r = await deleteResourceTypeAction(tenantSlug, id); setMsg({ type: r.success ? "success" : "error", text: r.message ?? "Done." }); });
  };

  if (types.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Create a resource type first.</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>Examples: Team member, Room, Court, Equipment</Typography>
        {canEdit && <Button component="a" href={`/${tenantSlug}/resources/types/new`} variant="contained">Create Resource Type</Button>}
      </Paper>
    );
  }

  return (
    <Box>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      {types.map((t) => (
        <Paper key={t.id} variant="outlined" sx={{ p: 2, mb: 1.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t.name}</Typography>
              <Chip label={RESOURCE_KIND_LABELS[t.resourceKind]} size="small" variant="outlined" />
              <Chip label={t.isActive ? "Active" : "Inactive"} color={t.isActive ? "success" : "default"} size="small" variant="outlined" />
            </Box>
            <Typography variant="body2" color="text.secondary">{t.displayNameSingular} / {t.displayNamePlural} &bull; {resourceCounts[t.id] ?? 0} resources</Typography>
          </Box>
          {canEdit && (
            <Box>
              <IconButton size="small" onClick={(e) => setMenuAnchor({ el: e.currentTarget, id: t.id })} disabled={isPending}>&#8942;</IconButton>
              <Menu anchorEl={menuAnchor?.id === t.id ? menuAnchor.el : null} open={menuAnchor?.id === t.id} onClose={() => setMenuAnchor(null)}>
                <MenuItem component="a" href={`/${tenantSlug}/resources/types/${t.id}/edit`} onClick={() => setMenuAnchor(null)}>Edit</MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); setDelDialog({ id: t.id, name: t.name }); }} sx={{ color: "error.main" }} disabled={(resourceCounts[t.id] ?? 0) > 0}>Delete</MenuItem>
              </Menu>
            </Box>
          )}
        </Paper>
      ))}
      <Dialog open={!!delDialog} onClose={() => setDelDialog(null)}>
        <DialogTitle>Delete Resource Type</DialogTitle>
        <DialogContent><DialogContentText>Delete <strong>{delDialog?.name}</strong>? This cannot be undone.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setDelDialog(null)} disabled={isPending}>Cancel</Button>
          <Button color="error" variant="contained" disabled={isPending} onClick={() => { if (delDialog) handleDelete(delDialog.id); }}>{isPending ? "Deleting..." : "Delete"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
