"use client";

/**
 * Tenant Support Actions Client — Milestone 15.11.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  startSupportSessionAction,
  endSupportSessionAction,
} from "@/features/platform/actions/support-session-actions";

type Props = {
  tenantId: string;
  activeSessionId: string | null;
};

export default function TenantSupportActions({ tenantId, activeSessionId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleStartSession = () => {
    if (reason.trim().length < 5) { setError("Reason must be at least 5 characters."); return; }
    setError(null);
    startTransition(async () => {
      const result = await startSupportSessionAction(tenantId, reason);
      if (result.success) { setDialogOpen(false); setReason(""); router.refresh(); }
      else setError(result.message);
    });
  };

  const handleEndSession = () => {
    if (!activeSessionId) return;
    startTransition(async () => {
      await endSupportSessionAction(activeSessionId);
      router.refresh();
    });
  };

  return (
    <>
      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        {!activeSessionId ? (
          <Button variant="contained" size="small" onClick={() => setDialogOpen(true)} disabled={pending}>
            Start Support Session
          </Button>
        ) : (
          <Button variant="outlined" color="warning" size="small" onClick={handleEndSession} disabled={pending}>
            End Support Session
          </Button>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Support Session</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            label="Reason for access"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            size="small"
            placeholder="e.g. Investigating failed gift card checkout reported by owner"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} size="small">Cancel</Button>
          <Button onClick={handleStartSession} variant="contained" size="small" disabled={pending || reason.trim().length < 5}>
            Start Session (30 min)
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
