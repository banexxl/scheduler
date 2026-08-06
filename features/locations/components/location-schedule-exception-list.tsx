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
import type { LocationExceptionWithPeriods } from "../types/location-schedule-exception";
import { EXCEPTION_TYPE_LABELS } from "../types/location-schedule-exception";
import { deleteLocationExceptionAction } from "../actions/location-exception-actions";

type Props = {
  exceptions: LocationExceptionWithPeriods[];
  tenantSlug: string;
  locationId: string;
  canEdit: boolean;
};

export default function LocationScheduleExceptionList({ exceptions, tenantSlug, locationId, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [delDialog, setDelDialog] = useState<{ id: string; title: string } | null>(null);

  const handleDelete = (id: string) => {
    setDelDialog(null);
    setMsg(null);
    startTransition(async () => {
      const r = await deleteLocationExceptionAction(tenantSlug, id);
      setMsg({ type: r.success ? "success" : "error", text: r.message ?? "Done." });
    });
  };

  if (exceptions.length === 0) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No schedule exceptions configured.</Typography>
        {canEdit && (
          <Button component={NextLink} href={`/${tenantSlug}/locations/${locationId}/business-hours/exceptions/new`} variant="outlined" size="small">
            Add Exception
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      {canEdit && (
        <Box sx={{ mb: 2 }}>
          <Button component={NextLink} href={`/${tenantSlug}/locations/${locationId}/business-hours/exceptions/new`} variant="outlined" size="small">
            Add Exception
          </Button>
        </Box>
      )}

      {exceptions.map((exc) => (
        <Paper key={exc.id} variant="outlined" sx={{ p: 1.5, mb: 1, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {exc.title ?? exc.exceptionDate}
              </Typography>
              <Chip label={EXCEPTION_TYPE_LABELS[exc.exceptionType]} size="small" variant="outlined"
                color={exc.exceptionType === "closed" ? "error" : "info"} />
              {!exc.isActive && <Chip label="Inactive" size="small" variant="outlined" color="default" />}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {exc.exceptionDate}
              {exc.exceptionType === "custom_hours" && exc.periods.length > 0 && (
                <> &bull; {exc.periods.map((p) => `${p.startTime}\u2013${p.endTime}`).join(", ")}</>
              )}
            </Typography>
          </Box>
          {canEdit && (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Button component={NextLink} href={`/${tenantSlug}/locations/${locationId}/business-hours/exceptions/${exc.id}/edit`} size="small" disabled={isPending}>
                Edit
              </Button>
              <IconButton size="small" onClick={() => setDelDialog({ id: exc.id, title: exc.title ?? exc.exceptionDate })} disabled={isPending} aria-label="Delete">
                &#10005;
              </IconButton>
            </Box>
          )}
        </Paper>
      ))}

      <Dialog open={!!delDialog} onClose={() => setDelDialog(null)}>
        <DialogTitle>Delete Exception</DialogTitle>
        <DialogContent><DialogContentText>Delete <strong>{delDialog?.title}</strong>? This cannot be undone.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setDelDialog(null)} disabled={isPending}>Cancel</Button>
          <Button color="error" variant="contained" disabled={isPending} onClick={() => { if (delDialog) handleDelete(delDialog.id); }}>
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
