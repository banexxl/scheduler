"use client";

/**
 * Notification Settings Form — Milestone 6.12.
 *
 * Allows owners/admins to configure email notification preferences.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { useFormik } from "formik";
import { notificationSettingsSchema } from "../schemas/notification-schemas";
import { updateNotificationSettingsAction } from "../actions/update-notification-settings-action";
import type { ResolvedNotificationSettings } from "../types/notification";

type Props = {
  tenantSlug: string;
  initialSettings: ResolvedNotificationSettings;
  providerConfigured: boolean;
  providerName: string;
};

export default function NotificationSettingsForm({
  tenantSlug,
  initialSettings,
  providerConfigured,
  providerName,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const formik = useFormik({
    initialValues: {
      emailNotificationsEnabled: initialSettings.emailNotificationsEnabled,
      sendBookingConfirmation: initialSettings.sendBookingConfirmation,
      sendRescheduleConfirmation: initialSettings.sendRescheduleConfirmation,
      sendCancellationConfirmation: initialSettings.sendCancellationConfirmation,
      replyToEmail: initialSettings.replyToEmail ?? "",
      senderName: initialSettings.senderName ?? "",
    },
    validationSchema: notificationSettingsSchema,
    onSubmit: (values) => {
      setFeedback(null);
      startTransition(async () => {
        const result = await updateNotificationSettingsAction(tenantSlug, {
          emailNotificationsEnabled: values.emailNotificationsEnabled,
          sendBookingConfirmation: values.sendBookingConfirmation,
          sendRescheduleConfirmation: values.sendRescheduleConfirmation,
          sendCancellationConfirmation: values.sendCancellationConfirmation,
          replyToEmail: values.replyToEmail || null,
          senderName: values.senderName || null,
        });

        if (result.success) {
          setFeedback({ type: "success", message: "Notification settings saved." });
        } else {
          setFeedback({ type: "error", message: result.error });
        }
      });
    },
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit}>
      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* Provider Status */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Email Provider
        </Typography>
        <Chip
          label={providerConfigured ? `${providerName} — configured` : "Email provider is not configured"}
          color={providerConfigured ? "success" : "warning"}
          size="small"
          variant="outlined"
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Global Toggle */}
      <FormControlLabel
        control={
          <Switch
            checked={formik.values.emailNotificationsEnabled}
            onChange={(e) => formik.setFieldValue("emailNotificationsEnabled", e.target.checked)}
          />
        }
        label="Enable email notifications"
      />

      <Box sx={{ mt: 2, ml: 2, opacity: formik.values.emailNotificationsEnabled ? 1 : 0.5 }}>
        <Typography variant="subtitle2" gutterBottom>
          Notification Events
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={formik.values.sendBookingConfirmation}
              onChange={(e) => formik.setFieldValue("sendBookingConfirmation", e.target.checked)}
              disabled={!formik.values.emailNotificationsEnabled}
            />
          }
          label="Send appointment confirmation"
        />

        <FormControlLabel
          control={
            <Switch
              checked={formik.values.sendRescheduleConfirmation}
              onChange={(e) => formik.setFieldValue("sendRescheduleConfirmation", e.target.checked)}
              disabled={!formik.values.emailNotificationsEnabled}
            />
          }
          label="Send reschedule confirmation"
          sx={{ display: "block" }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={formik.values.sendCancellationConfirmation}
              onChange={(e) => formik.setFieldValue("sendCancellationConfirmation", e.target.checked)}
              disabled={!formik.values.emailNotificationsEnabled}
            />
          }
          label="Send cancellation confirmation"
          sx={{ display: "block" }}
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Sender Identity */}
      <Typography variant="subtitle2" gutterBottom>
        Sender Identity
      </Typography>

      <TextField
        fullWidth
        label="Sender Display Name"
        placeholder="Your business name"
        name="senderName"
        value={formik.values.senderName}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.senderName && Boolean(formik.errors.senderName)}
        helperText={(formik.touched.senderName && formik.errors.senderName) || "Shown as the 'From' name in emails"}
        margin="normal"
        slotProps={{ htmlInput: { maxLength: 120 } }}
      />

      <TextField
        fullWidth
        label="Reply-To Email"
        placeholder="replies@yourbusiness.com"
        name="replyToEmail"
        value={formik.values.replyToEmail}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.replyToEmail && Boolean(formik.errors.replyToEmail)}
        helperText={(formik.touched.replyToEmail && formik.errors.replyToEmail) || "Customers will reply to this address"}
        margin="normal"
        slotProps={{ htmlInput: { maxLength: 320 } }}
      />

      <Box sx={{ mt: 3 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={isPending || !formik.dirty}
        >
          {isPending ? "Saving..." : "Save Settings"}
        </Button>
      </Box>
    </Box>
  );
}
