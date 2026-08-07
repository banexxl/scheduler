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
import type { ScheduleException } from "../types/schedule-exception";
import { deleteLocationScheduleExceptionAction } from "../actions/delete-location-schedule-exception";

type ScheduleExceptionListProps = {
  exceptions: ScheduleException[];
  tenantSlug: string;
  locationId: string;
  canEdit: boolean;
};

export default function ScheduleExceptionList({
  exceptions,
  tenantSlug,
  locationId,
  canEdit,
}: ScheduleExceptionListProps) {
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string; date: string } | null>(null);

  const today = new Date().toISOString().split("T")[0]!;

  const handleDelete = (id: string) => {
    setDeleteDialog(null);
    setMenuAnchor(null);
    setActionMessage(null);
    startTransition(async () => {
      const result = await deleteLocationScheduleExceptionAction(tenantSlug, id);
      setActionMessage({
        type: result.success ? "success" : "error",
        text: result.message ?? "Done.",
      });
    });
  };

  if (exceptions.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          No schedule exceptions found for this location.
        </Typography>
        {canEdit && (
          <Button
            component="a"
            href={`/${tenantSlug}/locations/${locationId}/exceptions/new`}
            variant="contained"
            sx={{ mt: 2 }}
          >
            Add Exception
          </Button>
        )}
      </Paper>
    );
  }

  // Group by upcoming / past
  const upcoming = exceptions.filter((e) => e.exceptionDate >= today);
  const past = exceptions.filter((e) => e.exceptionDate < today);

  const renderException = (exc: ScheduleException) => {
    const isPast = exc.exceptionDate < today;
    return (
      <Paper
        key={exc.id}
        variant="outlined"
        sx={{ p: 2, mb: 1, opacity: isPast ? 0.7 : 1, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
      >
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {exc.name}
            </Typography>
            <Chip
              label={exc.isClosed ? "Closed" : "Special hours"}
              color={exc.isClosed ? "error" : "info"}
              size="small"
              variant="outlined"
            />
            {isPast && <Chip label="Past" size="small" variant="outlined" />}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {exc.exceptionDate}
            {!exc.isClosed && exc.opensAt && exc.closesAt && ` \u2022 ${exc.opensAt}–${exc.closesAt}`}
          </Typography>
          {exc.notes && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {exc.notes.length > 80 ? `${exc.notes.slice(0, 80)}...` : exc.notes}
            </Typography>
          )}
        </Box>

        {canEdit && (
          <Box>
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor({ el: e.currentTarget, id: exc.id })}
              aria-label={`Actions for ${exc.name}`}
              disabled={isPending}
            >
              &#8942;
            </IconButton>
            <Menu
              anchorEl={menuAnchor?.id === exc.id ? menuAnchor.el : null}
              open={menuAnchor?.id === exc.id}
              onClose={() => setMenuAnchor(null)}
            >
              {!isPast && (
                <MenuItem
                  component="a"
                  href={`/${tenantSlug}/locations/${locationId}/exceptions/${exc.id}/edit`}
                  onClick={() => setMenuAnchor(null)}
                >
                  Edit
                </MenuItem>
              )}
              <MenuItem
                onClick={() => { setMenuAnchor(null); setDeleteDialog({ id: exc.id, name: exc.name, date: exc.exceptionDate }); }}
                sx={{ color: "error.main" }}
              >
                Delete
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Box>
      {actionMessage && (
        <Alert severity={actionMessage.type} sx={{ mb: 2 }} onClose={() => setActionMessage(null)}>
          {actionMessage.text}
        </Alert>
      )}

      {upcoming.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Upcoming</Typography>
          {upcoming.map(renderException)}
        </Box>
      )}

      {past.length > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}>Past</Typography>
          {past.map(renderException)}
        </Box>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete Exception</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{deleteDialog?.name}</strong> ({deleteDialog?.date})? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)} disabled={isPending}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isPending}
            onClick={() => { if (deleteDialog) handleDelete(deleteDialog.id); }}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
