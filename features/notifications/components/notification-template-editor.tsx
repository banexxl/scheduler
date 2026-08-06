"use client";

/**
 * Notification Template Editor — Milestone 6.12.
 *
 * Allows editing a single notification template (subject + body),
 * with variable reference, preview, and reset-to-default.
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { useFormik } from "formik";
import { notificationTemplateSchema } from "../schemas/notification-schemas";
import {
  updateNotificationTemplateAction,
  resetNotificationTemplateAction,
} from "../actions/update-notification-template-action";
import {
  SUPPORTED_TEMPLATE_VARIABLES,
  TEMPLATE_VARIABLE_LABELS,
  type NotificationTemplateType,
} from "../types/notification";

const TEMPLATE_TYPE_LABELS: Record<NotificationTemplateType, string> = {
  appointment_created: "Appointment Confirmation",
  appointment_rescheduled: "Appointment Rescheduled",
  appointment_cancelled: "Appointment Cancelled",
};

type Props = {
  tenantSlug: string;
  templateType: NotificationTemplateType;
  subjectTemplate: string;
  bodyTemplate: string;
  isCustom: boolean;
};

export default function NotificationTemplateEditor({
  tenantSlug,
  templateType,
  subjectTemplate,
  bodyTemplate,
  isCustom,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const formik = useFormik({
    initialValues: {
      subjectTemplate,
      bodyTemplate,
    },
    validationSchema: notificationTemplateSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      setFeedback(null);
      startTransition(async () => {
        const result = await updateNotificationTemplateAction(tenantSlug, templateType, {
          subjectTemplate: values.subjectTemplate,
          bodyTemplate: values.bodyTemplate,
        });

        if (result.success) {
          setFeedback({ type: "success", message: "Template saved." });
        } else {
          setFeedback({ type: "error", message: result.error });
        }
      });
    },
  });

  const handleReset = () => {
    setShowResetDialog(false);
    setFeedback(null);
    startTransition(async () => {
      const result = await resetNotificationTemplateAction(tenantSlug, templateType);
      if (result.success) {
        setFeedback({ type: "success", message: "Template reset to default. Reload to see changes." });
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  };

  // Simple preview: replace variables with sample data
  const sampleValues: Record<string, string> = {
    tenant_name: "Acme Salon",
    appointment_number: "APT-2025-000042",
    customer_name: "Jane Smith",
    service_name: "Haircut & Styling",
    resource_name: "Sarah Johnson",
    location_name: "Downtown Studio",
    appointment_date: "August 15, 2025",
    appointment_start_time: "10:00 AM",
    appointment_end_time: "11:00 AM",
    time_zone: "America/New_York",
    price: "45.00 USD",
    currency: "USD",
    cancellation_reason: "Schedule conflict",
  };

  const previewSubject = formik.values.subjectTemplate.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => sampleValues[key] ?? `{{${key}}}`
  );

  const previewBody = formik.values.bodyTemplate.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => {
      const val = sampleValues[key] ?? `{{${key}}}`;
      // Escape for safe display in dangerouslySetInnerHTML
      return val.replace(/[&<>"']/g, (c) => {
        const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
        return map[c] ?? c;
      });
    }
  );

  return (
    <Accordion defaultExpanded={false}>
      <AccordionSummary>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {TEMPLATE_TYPE_LABELS[templateType]}
          </Typography>
          {isCustom && <Chip label="Custom" size="small" color="primary" variant="outlined" />}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box component="form" onSubmit={formik.handleSubmit}>
          {feedback && (
            <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
              {feedback.message}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Subject"
            name="subjectTemplate"
            value={formik.values.subjectTemplate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.subjectTemplate && Boolean(formik.errors.subjectTemplate)}
            helperText={formik.touched.subjectTemplate && formik.errors.subjectTemplate}
            margin="normal"
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />

          <TextField
            fullWidth
            multiline
            minRows={8}
            maxRows={20}
            label="Body (HTML)"
            name="bodyTemplate"
            value={formik.values.bodyTemplate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.bodyTemplate && Boolean(formik.errors.bodyTemplate)}
            helperText={formik.touched.bodyTemplate && formik.errors.bodyTemplate}
            margin="normal"
            slotProps={{ htmlInput: { maxLength: 20000 } }}
          />

          {/* Supported Variables */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Supported Variables (click to copy)
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
              {SUPPORTED_TEMPLATE_VARIABLES.map((varName) => (
                <Chip
                  key={varName}
                  label={`{{${varName}}}`}
                  size="small"
                  variant="outlined"
                  title={TEMPLATE_VARIABLE_LABELS[varName]}
                  onClick={() => {
                    navigator.clipboard?.writeText(`{{${varName}}}`);
                  }}
                  sx={{ cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem" }}
                />
              ))}
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="small"
              disabled={isPending || !formik.dirty}
            >
              {isPending ? "Saving..." : "Save Template"}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? "Hide Preview" : "Preview"}
            </Button>
            {isCustom && (
              <Button
                variant="text"
                size="small"
                color="warning"
                onClick={() => setShowResetDialog(true)}
                disabled={isPending}
              >
                Reset to Default
              </Button>
            )}
          </Box>

          {/* Preview */}
          {showPreview && (
            <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Preview (with sample data)
              </Typography>
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
                Subject: {previewSubject}
              </Typography>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                  maxHeight: 400,
                  overflow: "auto",
                  backgroundColor: "background.default",
                }}
                dangerouslySetInnerHTML={{ __html: previewBody }}
              />
            </Paper>
          )}
        </Box>

        {/* Reset Confirmation Dialog */}
        <Dialog open={showResetDialog} onClose={() => setShowResetDialog(false)}>
          <DialogTitle>Reset Template</DialogTitle>
          <DialogContent>
            <Typography>
              This will delete your custom template and revert to the default.
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button onClick={handleReset} color="warning" variant="contained">
              Reset to Default
            </Button>
          </DialogActions>
        </Dialog>
      </AccordionDetails>
    </Accordion>
  );
}
