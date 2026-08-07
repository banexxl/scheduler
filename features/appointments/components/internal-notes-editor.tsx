"use client";

/**
 * Internal Notes Editor — Milestone 8.3.
 *
 * Inline editable internal notes for the appointment detail and operational views.
 * Authorized staff can view and edit notes directly without navigating to the edit page.
 *
 * Internal notes must never appear in:
 * - Customer-facing emails
 * - Reminders
 * - Public booking pages
 * - Self-service portals
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { useRouter } from "next/navigation";
import { updateAppointmentAction } from "../actions/update-appointment-action";

type Props = {
  tenantSlug: string;
  appointmentId: string;
  initialNotes: string | null;
  canEdit: boolean;
};

export default function InternalNotesEditor({
  tenantSlug,
  appointmentId,
  initialNotes,
  canEdit,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSave() {
    setFeedback(null);
    const result = await updateAppointmentAction(tenantSlug, appointmentId, {
      internalNotes: notes.trim() || null,
    });

    if (result.success) {
      setIsEditing(false);
      setFeedback({ type: "success", message: "Notes saved." });
      startTransition(() => router.refresh());
    } else {
      setFeedback({ type: "error", message: result.error });
    }
  }

  function handleCancel() {
    setNotes(initialNotes ?? "");
    setIsEditing(false);
    setFeedback(null);
  }

  return (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h6">Internal Notes</Typography>
        {canEdit && !isEditing && (
          <Button size="small" variant="text" onClick={() => setIsEditing(true)}>
            {initialNotes ? "Edit" : "Add notes"}
          </Button>
        )}
      </Box>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 1 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {isEditing ? (
        <Box>
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal notes (visible to staff only)..."
            slotProps={{ htmlInput: { maxLength: 5000 } }}
            disabled={isPending}
          />
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            Internal notes are visible to staff only. They are never included in customer emails or reminders.
          </Typography>
        </Box>
      ) : initialNotes ? (
        <Typography sx={{ whiteSpace: "pre-wrap" }}>{initialNotes}</Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No internal notes.
        </Typography>
      )}
    </Paper>
  );
}
