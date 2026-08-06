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
import type { Service } from "../types/service";
import { deleteServiceAction } from "../actions/delete-service";
import { toggleServiceStatusAction } from "../actions/toggle-service-status";

type LocationInfo = { count: number; locationNames: string[] };

type Props = {
  services: Service[];
  tenantSlug: string;
  canEdit: boolean;
  /** Map of serviceId → location assignment info */
  locationMap?: Map<string, LocationInfo>;
};

export default function ServiceList({ services, tenantSlug, canEdit, locationMap }: Props) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [delDialog, setDelDialog] = useState<{ id: string; name: string } | null>(null);

  const handleAction = (action: () => Promise<{ success: boolean; message?: string }>) => {
    setMenuAnchor(null);
    setMsg(null);
    startTransition(async () => { const r = await action(); setMsg({ type: r.success ? "success" : "error", text: r.message ?? "Done." }); });
  };

  if (services.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>No services yet. Create your first bookable service.</Typography>
        {canEdit && <Button component={NextLink} href={`/${tenantSlug}/services/new`} variant="contained">Add Service</Button>}
      </Paper>
    );
  }

  return (
    <Box>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      {services.map((svc) => (
        <Paper key={svc.id} variant="outlined" sx={{ p: 2, mb: 1.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{svc.name}</Typography>
              {svc.categoryName && <Chip label={svc.categoryName} size="small" variant="outlined" />}
              <Chip label={svc.isActive ? "Active" : "Inactive"} color={svc.isActive ? "success" : "default"} size="small" variant="outlined" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {svc.durationMinutes} min &bull; {svc.price > 0 ? `${svc.price} ${svc.currency}` : "Free"}
              {(svc.bufferBeforeMinutes > 0 || svc.bufferAfterMinutes > 0) && ` \u2022 Buffers: ${svc.bufferBeforeMinutes}/${svc.bufferAfterMinutes} min`}
            </Typography>
            {locationMap && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {(() => {
                  const info = locationMap.get(svc.id);
                  if (!info || info.count === 0) return "Not assigned to a location";
                  if (info.count <= 3) return info.locationNames.join(", ");
                  return `${info.count} locations`;
                })()}
              </Typography>
            )}
          </Box>
          {canEdit && (
            <Box>
              <IconButton size="small" onClick={(e) => setMenuAnchor({ el: e.currentTarget, id: svc.id })} disabled={isPending}>&#8942;</IconButton>
              <Menu anchorEl={menuAnchor?.id === svc.id ? menuAnchor.el : null} open={menuAnchor?.id === svc.id} onClose={() => setMenuAnchor(null)}>
                <MenuItem component={NextLink} href={`/${tenantSlug}/services/${svc.id}/edit`} onClick={() => setMenuAnchor(null)}>Edit</MenuItem>
                <MenuItem onClick={() => handleAction(() => toggleServiceStatusAction(tenantSlug, svc.id, !svc.isActive))}>{svc.isActive ? "Deactivate" : "Activate"}</MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); setDelDialog({ id: svc.id, name: svc.name }); }} sx={{ color: "error.main" }}>Delete</MenuItem>
              </Menu>
            </Box>
          )}
        </Paper>
      ))}
      <Dialog open={!!delDialog} onClose={() => setDelDialog(null)}>
        <DialogTitle>Delete Service</DialogTitle>
        <DialogContent><DialogContentText>Delete <strong>{delDialog?.name}</strong>? This cannot be undone.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setDelDialog(null)} disabled={isPending}>Cancel</Button>
          <Button color="error" variant="contained" disabled={isPending} onClick={() => { if (delDialog) handleAction(() => deleteServiceAction(tenantSlug, delDialog.id)); setDelDialog(null); }}>{isPending ? "Deleting..." : "Delete"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
