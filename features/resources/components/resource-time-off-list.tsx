"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import NextLink from "next/link";
import type { ResourceTimeOffWithLocation } from "../types/resource-time-off";
import { deleteResourceTimeOffAction } from "../actions/resource-time-off-actions";

type ResourceTimeOffListProps = {
  entries: ResourceTimeOffWithLocation[];
  tenantSlug: string;
  resourceId: string;
  canEdit: boolean;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatRange(entry: ResourceTimeOffWithLocation): string {
  if (entry.isAllDay) {
    const start = formatDate(entry.startsAt);
    const endDate = new Date(entry.endsAt);
    endDate.setDate(endDate.getDate() - 1); // exclusive end → inclusive display
    const end = formatDate(endDate.toISOString());
    return start === end ? start : `${start} — ${end}`;
  }
  const startDate = formatDate(entry.startsAt);
  const endDate = formatDate(entry.endsAt);
  if (startDate === endDate) {
    return `${startDate}, ${formatTime(entry.startsAt)} — ${formatTime(entry.endsAt)}`;
  }
  return `${startDate} ${formatTime(entry.startsAt)} — ${endDate} ${formatTime(entry.endsAt)}`;
}

export default function ResourceTimeOffList({
  entries,
  tenantSlug,
  resourceId,
  canEdit,
}: ResourceTimeOffListProps) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [delDialog, setDelDialog] = useState<{ id: string; title: string } | null>(null);

  const handleDelete = (id: string) => {
    setDelDialog(null);
    setMsg(null);
    startTransition(async () => {
      const r = await deleteResourceTimeOffAction(tenantSlug, id);
      setMsg({ type: r.success ? "success" : "error", text: r.message ?? "Done." });
    });
  };

  if (entries.length === 0) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No time off scheduled.
        </Typography>
        {canEdit && (
          <Button
            component={NextLink}
            href={`/${tenantSlug}/resources/${resourceId}/time-off/new`}
            variant="outlined"
            size="small"
          >
            Add Time Off
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {msg && (
        <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      {canEdit && (
        <Box sx={{ mb: 2 }}>
          <Button
            component={NextLink}
            href={`/${tenantSlug}/resources/${resourceId}/time-off/new`}
            variant="outlined"
            size="small"
          >
            Add Time Off
          </Button>
        </Box>
      )}

      {entries.map((entry) => (
        <Paper key={entry.id} variant="outlined" sx={{ p: 1.5, mb: 1, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {entry.title ?? "Time Off"}
              </Typography>
              {entry.isAllDay && (
                <Chip label="Full day" size="small" variant="outlined" />
              )}
              {entry.locationName && (
                <Chip label={entry.locationName} size="small" variant="outlined" />
              )}
              {!entry.isActive && (
                <Chip label="Inactive" size="small" variant="outlined" color="default" />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {formatRange(entry)}
            </Typography>
          </Box>

          {canEdit && (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Button
                component={NextLink}
                href={`/${tenantSlug}/resources/${resourceId}/time-off/${entry.id}/edit`}
                size="small"
                disabled={isPending}
              >
                Edit
              </Button>
              <IconButton
                size="small"
                onClick={() => setDelDialog({ id: entry.id, title: entry.title ?? "Time Off" })}
                disabled={isPending}
                aria-label="Delete"
              >
                &#10005;
              </IconButton>
            </Box>
          )}
        </Paper>
      ))}

      <Dialog open={!!delDialog} onClose={() => setDelDialog(null)}>
        <DialogTitle>Delete Time Off</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{delDialog?.title}</strong>? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelDialog(null)} disabled={isPending}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isPending}
            onClick={() => { if (delDialog) handleDelete(delDialog.id); }}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
