"use client";

/**
 * Plan Action Buttons with Confirmation Dialogs — Milestone 15.13.
 *
 * Each destructive/significant action shows a confirmation dialog explaining
 * what will happen before executing.
 */

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import toast from "react-hot-toast";

type PlanInfo = {
  id: string;
  name: string;
  planKey: string;
  isActive: boolean;
  isPublic: boolean;
  polarProductId: string | null;
};

type Props = {
  plan: PlanInfo;
  onToggleActive: (planId: string, nextState: boolean) => Promise<void>;
  onTogglePublic: (planId: string, nextState: boolean) => Promise<void>;
  onDelete: (planId: string) => Promise<void>;
  onRefresh: (polarProductId: string) => Promise<void>;
};

export default function PlanActionButtons({ plan, onToggleActive, onTogglePublic, onDelete, onRefresh }: Props) {
  const [dialog, setDialog] = useState<"activate" | "deactivate" | "show" | "hide" | "delete" | "refresh" | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      switch (dialog) {
        case "activate":
          await onToggleActive(plan.id, true);
          toast.success(`"${plan.name}" activated.`);
          break;
        case "deactivate":
          await onToggleActive(plan.id, false);
          toast.success(`"${plan.name}" deactivated.`);
          break;
        case "show":
          await onTogglePublic(plan.id, true);
          toast.success(`"${plan.name}" is now public.`);
          break;
        case "hide":
          await onTogglePublic(plan.id, false);
          toast.success(`"${plan.name}" hidden.`);
          break;
        case "delete":
          await onDelete(plan.id);
          toast.success(`"${plan.name}" deleted.`);
          break;
        case "refresh":
          if (plan.polarProductId) await onRefresh(plan.polarProductId);
          toast.success(`"${plan.name}" refreshed from Polar.`);
          break;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
      setDialog(null);
    }
  }

  const dialogConfig: Record<string, { title: string; description: string; confirmLabel: string; color: "error" | "primary" | "warning" }> = {
    activate: {
      title: `Activate "${plan.name}"?`,
      description: `This plan will become active and available for new subscriptions.${plan.polarProductId ? " The product will be unarchived on Polar." : ""}`,
      confirmLabel: "Activate",
      color: "primary",
    },
    deactivate: {
      title: `Deactivate "${plan.name}"?`,
      description: `This plan will no longer be available for new subscriptions. Existing subscribers will keep their access until their subscription ends.${plan.polarProductId ? " The product will be archived on Polar." : ""}`,
      confirmLabel: "Deactivate",
      color: "warning",
    },
    show: {
      title: `Make "${plan.name}" public?`,
      description: "This plan will appear on the pricing page and be available for self-service checkout.",
      confirmLabel: "Make Public",
      color: "primary",
    },
    hide: {
      title: `Hide "${plan.name}"?`,
      description: "This plan will be hidden from the pricing page. Existing subscribers are not affected. Admins can still assign it manually.",
      confirmLabel: "Hide",
      color: "warning",
    },
    delete: {
      title: `Delete "${plan.name}"?`,
      description: `This will permanently delete the plan "${plan.planKey}" from your database.${plan.polarProductId ? " The associated Polar product will be archived (Polar does not support hard deletes)." : ""} This action cannot be undone.`,
      confirmLabel: "Delete Plan",
      color: "error",
    },
    refresh: {
      title: `Refresh "${plan.name}" from Polar?`,
      description: "This will fetch the latest product data (name, prices, status) from Polar and update the local plan. Use this if you made changes directly in the Polar dashboard.",
      confirmLabel: "Refresh",
      color: "primary",
    },
  };

  const currentDialog = dialog ? dialogConfig[dialog] : null;

  return (
    <>
      <Stack spacing={0.75}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setDialog(plan.isActive ? "deactivate" : "activate")}
        >
          {plan.isActive ? "Deactivate" : "Activate"}
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setDialog(plan.isPublic ? "hide" : "show")}
        >
          {plan.isPublic ? "Hide" : "Show"}
        </Button>
        {plan.polarProductId && (
          <Button size="small" variant="outlined" onClick={() => setDialog("refresh")}>
            Refresh Product
          </Button>
        )}
        <Button size="small" variant="outlined" color="error" onClick={() => setDialog("delete")}>
          Delete
        </Button>
      </Stack>

      {/* Confirmation Dialog */}
      <Dialog open={Boolean(dialog)} onClose={() => !loading && setDialog(null)}>
        {currentDialog && (
          <>
            <DialogTitle>{currentDialog.title}</DialogTitle>
            <DialogContent>
              <DialogContentText>{currentDialog.description}</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(null)} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading}
                color={currentDialog.color}
                variant="contained"
              >
                {loading ? <CircularProgress size={20} /> : currentDialog.confirmLabel}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
