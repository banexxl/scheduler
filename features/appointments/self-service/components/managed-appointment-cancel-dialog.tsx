"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export default function ManagedAppointmentCancelDialog({
     open,
     busy,
     onClose,
     onConfirm,
}: {
     open: boolean;
     busy: boolean;
     onClose: () => void;
     onConfirm: (reason: string | null) => Promise<void>;
}) {
     const [reason, setReason] = useState("");

     return (
          <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
               <DialogTitle>Cancel appointment</DialogTitle>
               <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                         This will release your appointment time. This action cannot be undone.
                    </Typography>
                    <TextField
                         label="Optional reason"
                         helperText="This may be shared with the business team."
                         fullWidth
                         multiline
                         minRows={3}
                         value={reason}
                         onChange={(event) => setReason(event.target.value)}
                         inputProps={{ maxLength: 500 }}
                    />
               </DialogContent>
               <DialogActions>
                    <Button onClick={onClose} disabled={busy}>Keep appointment</Button>
                    <Button
                         color="error"
                         variant="contained"
                         disabled={busy}
                         onClick={async () => {
                              await onConfirm(reason.trim() || null);
                              setReason("");
                         }}
                    >
                         Confirm cancellation
                    </Button>
               </DialogActions>
          </Dialog>
     );
}
