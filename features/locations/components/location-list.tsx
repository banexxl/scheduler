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
import type { LocationListItem } from "../services/get-business-locations";
import { setPrimaryLocationAction } from "../actions/set-primary-location";
import { toggleLocationStatusAction } from "../actions/toggle-location-status";
import { deleteLocationAction } from "../actions/delete-location";

type LocationListProps = {
  locations: LocationListItem[];
  tenantSlug: string;
  canEdit: boolean;
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  physical: "Physical",
  online: "Online",
  customer_address: "Customer's address",
};

export default function LocationList({ locations, tenantSlug, canEdit }: LocationListProps) {
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; locationId: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);

  const handleAction = (action: () => Promise<{ success: boolean; message?: string }>) => {
    setMenuAnchor(null);
    setActionMessage(null);
    startTransition(async () => {
      const result = await action();
      setActionMessage({
        type: result.success ? "success" : "error",
        text: result.message ?? (result.success ? "Done." : "Action failed."),
      });
    });
  };

  if (locations.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          Your business has no locations yet.
        </Typography>
        {canEdit && (
          <Button
            component={NextLink}
            href={`/${tenantSlug}/locations/new`}
            variant="contained"
            sx={{ mt: 2 }}
          >
            Add Location
          </Button>
        )}
      </Paper>
    );
  }

  return (
    <Box>
      {actionMessage && (
        <Alert severity={actionMessage.type} sx={{ mb: 2 }} onClose={() => setActionMessage(null)}>
          {actionMessage.text}
        </Alert>
      )}

      {locations.map((loc) => (
        <Paper key={loc.id} variant="outlined" sx={{ p: 2, mb: 1.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {loc.name}
              </Typography>
              {loc.isPrimary && <Chip label="Primary" color="primary" size="small" />}
              <Chip
                label={loc.isActive ? "Active" : "Inactive"}
                color={loc.isActive ? "success" : "default"}
                size="small"
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {LOCATION_TYPE_LABELS[loc.locationType] ?? loc.locationType}
              {loc.city && ` \u2022 ${loc.city}`}
              {loc.country && `, ${loc.country}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {loc.timezone}
              {loc.phoneNumber && ` \u2022 ${loc.phoneNumber}`}
              {loc.email && ` \u2022 ${loc.email}`}
            </Typography>
          </Box>

          {canEdit && (
            <Box>
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchor({ el: e.currentTarget, locationId: loc.id })}
                aria-label={`Actions for ${loc.name}`}
                disabled={isPending}
              >
                &#8942;
              </IconButton>
              <Menu
                anchorEl={menuAnchor?.locationId === loc.id ? menuAnchor.el : null}
                open={menuAnchor?.locationId === loc.id}
                onClose={() => setMenuAnchor(null)}
              >
                <MenuItem component={NextLink} href={`/${tenantSlug}/locations/${loc.id}/edit`}>
                  Edit
                </MenuItem>
                <MenuItem component={NextLink} href={`/${tenantSlug}/locations/${loc.id}/working-hours`}>
                  Working Hours
                </MenuItem>
                <MenuItem component={NextLink} href={`/${tenantSlug}/locations/${loc.id}/exceptions`}>
                  Schedule Exceptions
                </MenuItem>
                {!loc.isPrimary && (
                  <MenuItem onClick={() => handleAction(() => setPrimaryLocationAction(tenantSlug, loc.id))}>
                    Make Primary
                  </MenuItem>
                )}
                {!loc.isPrimary && (
                  <MenuItem onClick={() => handleAction(() => toggleLocationStatusAction(tenantSlug, loc.id, !loc.isActive))}>
                    {loc.isActive ? "Deactivate" : "Activate"}
                  </MenuItem>
                )}
                {loc.isPrimary && !loc.isActive && (
                  <MenuItem onClick={() => handleAction(() => toggleLocationStatusAction(tenantSlug, loc.id, true))}>
                    Activate
                  </MenuItem>
                )}
                {!loc.isPrimary && (
                  <MenuItem
                    onClick={() => { setMenuAnchor(null); setDeleteDialog({ id: loc.id, name: loc.name }); }}
                    sx={{ color: "error.main" }}
                  >
                    Delete
                  </MenuItem>
                )}
              </Menu>
            </Box>
          )}
        </Paper>
      ))}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete Location</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteDialog?.name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)} disabled={isPending}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isPending}
            onClick={() => {
              if (deleteDialog) {
                handleAction(() => deleteLocationAction(tenantSlug, deleteDialog.id));
                setDeleteDialog(null);
              }
            }}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
