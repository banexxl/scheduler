"use client";

/**
 * Tenant Deletion Section — Milestone 13.2.
 *
 * Danger zone UI for permanently deleting a business.
 * Shows preview counts, blockers, and requires explicit confirmation.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import {
  requestTenantDeletionPreviewAction,
  deleteTenantPermanentlyAction,
  type TenantDeletionPreview,
} from "../actions/delete-tenant-action";

type Props = {
  tenantSlug: string;
  tenantName: string;
};

export default function DeleteTenantSection({ tenantSlug, tenantName }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<TenantDeletionPreview | null>(null);
  const [confirmValue, setConfirmValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, startTransition] = useTransition();

  const handleOpenDialog = () => {
    setError(null);
    setPreview(null);
    setConfirmValue("");
    setDialogOpen(true);

    // Load preview
    startTransition(async () => {
      const result = await requestTenantDeletionPreviewAction(tenantSlug);
      if (result.success) {
        setPreview(result.preview);
      } else {
        setError(result.message);
      }
    });
  };

  const handleDelete = () => {
    if (confirmValue !== tenantSlug) {
      setError(`Please type "${tenantSlug}" to confirm.`);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteTenantPermanentlyAction(tenantSlug, confirmValue);
      if (!result.success) {
        setError(result.message);
      }
      // On success, the action redirects — no further client handling needed
    });
  };

  const hasBlockers = preview?.blockers.activeSubscription || preview?.blockers.pendingRefunds;

  return (
    <Box sx={{ mt: 6 }}>
      <Divider sx={{ mb: 3 }} />
      <Typography variant="h6" color="error" gutterBottom>
        Danger Zone
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Permanently delete this business and all associated data. This action cannot be undone.
      </Typography>
      <Button
        variant="outlined"
        color="error"
        onClick={handleOpenDialog}
        disabled={loading}
      >
        Delete Business
      </Button>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle color="error">Delete &ldquo;{tenantName}&rdquo;</DialogTitle>
        <DialogContent>
          {loading && !preview && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {preview && (
            <>
              {hasBlockers && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {preview.blockers.activeSubscription && (
                    <Typography variant="body2">
                      You have an active subscription. Cancel it before deleting.
                    </Typography>
                  )}
                  {preview.blockers.pendingRefunds && (
                    <Typography variant="body2">
                      You have pending refunds that must be resolved first.
                    </Typography>
                  )}
                </Alert>
              )}

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Deleting this business removes access to its operational data.
                  Your personal account will remain active.
                  Memberships in other businesses will not be affected.
                </Typography>
              </Alert>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Data that will be permanently deleted:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 2, "& li": { mb: 0.5 } }}>
                <li><Typography variant="body2">Team members: {preview.summary.members}</Typography></li>
                <li><Typography variant="body2">Appointments: {preview.summary.appointments}</Typography></li>
                <li><Typography variant="body2">Services: {preview.summary.services}</Typography></li>
                <li><Typography variant="body2">Locations: {preview.summary.locations}</Typography></li>
                <li><Typography variant="body2">Resources: {preview.summary.resources}</Typography></li>
                <li><Typography variant="body2">Customers: {preview.summary.customers}</Typography></li>
                <li><Typography variant="body2">Payments: {preview.summary.payments}</Typography></li>
                <li><Typography variant="body2">Packages: {preview.summary.packages}</Typography></li>
                <li><Typography variant="body2">Reviews: {preview.summary.reviews}</Typography></li>
              </Box>

              {!hasBlockers && (
                <TextField
                  fullWidth
                  label={`Type "${tenantSlug}" to confirm`}
                  placeholder={tenantSlug}
                  value={confirmValue}
                  onChange={(e) => setConfirmValue(e.target.value)}
                  error={!!error}
                  disabled={loading}
                  sx={{ mt: 1 }}
                  autoComplete="off"
                />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={loading || hasBlockers || confirmValue !== tenantSlug}
          >
            {loading ? <CircularProgress size={20} /> : "Delete Permanently"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
