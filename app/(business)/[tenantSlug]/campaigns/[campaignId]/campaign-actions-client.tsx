"use client";

/**
 * Campaign Actions Client — Milestone 15.7.
 *
 * Provides action buttons for campaign detail page:
 * - Draft: Edit, Send Test, Send Now, Schedule, Delete
 * - Scheduled: Cancel
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  sendTestCampaignAction,
  sendCampaignNowAction,
  scheduleCampaignAction,
  cancelCampaignAction,
  deleteCampaignAction,
} from "@/features/campaigns/actions/campaign-actions";
import type { CampaignStatus } from "@/features/campaigns/types/campaign";

type Props = {
  tenantSlug: string;
  campaignId: string;
  status: CampaignStatus;
};

export default function CampaignActionsClient({ tenantSlug, campaignId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const handleTestSend = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestCampaignAction(tenantSlug, campaignId);
      setMessage(result.success
        ? { type: "success", text: "Test email sent to your account." }
        : { type: "error", text: result.message }
      );
    });
  };

  const handleSendNow = () => {
    if (!confirm("Send this campaign now? This cannot be undone.")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await sendCampaignNowAction(tenantSlug, campaignId);
      if (result.success) {
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  };

  const handleSchedule = () => {
    if (!scheduleDate) return;
    setMessage(null);
    startTransition(async () => {
      const utcDate = new Date(scheduleDate).toISOString();
      const result = await scheduleCampaignAction(tenantSlug, campaignId, utcDate);
      if (result.success) {
        setScheduleOpen(false);
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    });
  };

  const handleCancel = () => {
    if (!confirm("Cancel this campaign?")) return;
    startTransition(async () => {
      const result = await cancelCampaignAction(tenantSlug, campaignId);
      if (result.success) router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteCampaignAction(tenantSlug, campaignId);
      if (result.success) router.push(`/${tenantSlug}/campaigns`);
    });
  };

  return (
    <>
      {message && <Alert severity={message.type} sx={{ mb: 1 }}>{message.text}</Alert>}

      <Stack direction="row" spacing={1} flexWrap="wrap">
        {status === "draft" && (
          <>
            <Button href={`/${tenantSlug}/campaigns/${campaignId}/edit`} variant="outlined" size="small" disabled={pending}>
              Edit
            </Button>
            <Button variant="outlined" size="small" onClick={handleTestSend} disabled={pending}>
              Send Test
            </Button>
            <Button variant="contained" size="small" onClick={handleSendNow} disabled={pending}>
              Send Now
            </Button>
            <Button variant="outlined" size="small" onClick={() => setScheduleOpen(true)} disabled={pending}>
              Schedule
            </Button>
            <Button variant="outlined" color="error" size="small" onClick={handleDelete} disabled={pending}>
              Delete
            </Button>
          </>
        )}
        {status === "scheduled" && (
          <Button variant="outlined" color="error" size="small" onClick={handleCancel} disabled={pending}>
            Cancel
          </Button>
        )}
      </Stack>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)}>
        <DialogTitle>Schedule Campaign</DialogTitle>
        <DialogContent>
          <TextField
            type="datetime-local"
            label="Send at"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleOpen(false)} size="small">Cancel</Button>
          <Button onClick={handleSchedule} variant="contained" size="small" disabled={pending || !scheduleDate}>
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
