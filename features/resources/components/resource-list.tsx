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
import type { Resource } from "../types/resource";
import { RESOURCE_KIND_LABELS, type ResourceKind } from "../types/resource";
import { deleteResourceAction } from "../actions/delete-resource";

type Props = { resources: Resource[]; tenantSlug: string; canEdit: boolean };

export default function ResourceList({ resources, tenantSlug, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [delDialog, setDelDialog] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (id: string) => {
    setDelDialog(null);
    setMsg(null);
    startTransition(async () => { const r = await deleteResourceAction(tenantSlug, id); setMsg({ type: r.success ? "success" : "error", text: r.message ?? "Done." }); });
  };

  if (resources.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>No resources yet. Add the first resource that customers will eventually be able to book.</Typography>
        {canEdit && <Button component="a" href={`/${tenantSlug}/resources/new`} variant="contained">Add Resource</Button>}
      </Paper>
    );
  }

  return (
    <Box>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      {resources.map((r) => {
        const primaryLoc = r.locations.find((l) => l.isPrimary);
        return (
          <Paper key={r.id} variant="outlined" sx={{ p: 2, mb: 1.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                <Chip label={r.resourceTypeName} size="small" variant="outlined" />
                <Chip label={RESOURCE_KIND_LABELS[r.resourceKind as ResourceKind] ?? r.resourceKind} size="small" variant="outlined" />
                <Chip label={r.isActive ? "Active" : "Inactive"} color={r.isActive ? "success" : "default"} size="small" variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {primaryLoc ? `Primary: ${primaryLoc.locationName}` : ""}
                {r.locations.length > 1 ? ` (+${r.locations.length - 1} more)` : ""}
              </Typography>
            </Box>
            {canEdit && (
              <Box>
                <IconButton size="small" onClick={(e) => setMenuAnchor({ el: e.currentTarget, id: r.id })} disabled={isPending}>&#8942;</IconButton>
                <Menu anchorEl={menuAnchor?.id === r.id ? menuAnchor.el : null} open={menuAnchor?.id === r.id} onClose={() => setMenuAnchor(null)}>
                  <MenuItem component="a" href={`/${tenantSlug}/resources/${r.id}/edit`} onClick={() => setMenuAnchor(null)}>Edit</MenuItem>
                  <MenuItem component="a" href={`/${tenantSlug}/resources/${r.id}/media`} onClick={() => setMenuAnchor(null)}>Media</MenuItem>
                  <MenuItem onClick={() => { setMenuAnchor(null); setDelDialog({ id: r.id, name: r.name }); }} sx={{ color: "error.main" }}>Delete</MenuItem>
                </Menu>
              </Box>
            )}
          </Paper>
        );
      })}
      <Dialog open={!!delDialog} onClose={() => setDelDialog(null)}>
        <DialogTitle>Delete Resource</DialogTitle>
        <DialogContent><DialogContentText>Delete <strong>{delDialog?.name}</strong> and all its location assignments? This cannot be undone.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setDelDialog(null)} disabled={isPending}>Cancel</Button>
          <Button color="error" variant="contained" disabled={isPending} onClick={() => { if (delDialog) handleDelete(delDialog.id); }}>{isPending ? "Deleting..." : "Delete"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
