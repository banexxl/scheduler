"use client";

/**
 * Edit/Cancel Scope Dialog — Milestone 15.1.
 *
 * When editing or cancelling a recurring appointment, asks user to choose scope.
 */

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { CancelScope } from "../types/recurrence";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: CancelScope) => void;
  action: "edit" | "cancel";
  loading?: boolean;
};

export default function EditScopeDialog({
  open,
  onClose,
  onConfirm,
  action,
  loading,
}: Props) {
  const [scope, setScope] = useState<CancelScope>("this_only");

  const title = action === "cancel" ? "Cancel recurring appointment" : "Edit recurring appointment";
  const description = action === "cancel"
    ? "Choose which appointments to cancel:"
    : "Apply changes to:";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: "1rem", fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.8125rem", color: "#6b7280", mb: 1.5 }}>
          {description}
        </Typography>
        <RadioGroup value={scope} onChange={(e) => setScope(e.target.value as CancelScope)}>
          <FormControlLabel
            value="this_only"
            control={<Radio size="small" />}
            label={<Typography sx={{ fontSize: "0.875rem" }}>This appointment only</Typography>}
          />
          <FormControlLabel
            value="this_and_future"
            control={<Radio size="small" />}
            label={<Typography sx={{ fontSize: "0.875rem" }}>This and future appointments</Typography>}
          />
        </RadioGroup>
        <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af", mt: 1 }}>
          Past and completed appointments won&apos;t be changed.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading} size="small">
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(scope)}
          disabled={loading}
          variant="contained"
          size="small"
          color={action === "cancel" ? "error" : "primary"}
        >
          {action === "cancel" ? "Cancel appointments" : "Apply changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
