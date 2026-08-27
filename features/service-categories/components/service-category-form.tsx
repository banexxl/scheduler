"use client";

import { useState, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import { showActionToast } from "@/lib/hooks/use-action-toast";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
import { serviceCategorySchema, type ServiceCategoryFormValues } from "../schemas/service-category-schema";
import { generateTenantSlug } from "@/lib/tenants/generate-tenant-slug";

type ServiceCategoryFormProps = {
  initialValues: ServiceCategoryFormValues;
  onSubmit: (values: ServiceCategoryFormValues) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  canEdit: boolean;
};

function VisibilityBadge({ visible }: { visible: boolean }) {
  return visible ? (
    <Chip icon={<VisibilityIcon sx={{ fontSize: 14 }} />} label="Customer-visible" size="small" color="info" variant="outlined" sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }} />
  ) : (
    <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="Internal only" size="small" variant="outlined" sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }} />
  );
}

export default function ServiceCategoryForm({ initialValues, onSubmit, submitLabel, canEdit }: ServiceCategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);

  const handleSubmit = (values: ServiceCategoryFormValues, { resetForm }: { resetForm: (o: { values: ServiceCategoryFormValues }) => void }) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => { const r = await onSubmit(values); setActionResult(r); showActionToast(r, "Category saved!"); if (r.success) resetForm({ values }); });
  };

  return (
    <Formik initialValues={initialValues} validationSchema={serviceCategorySchema} onSubmit={handleSubmit} validateOnBlur validateOnChange={false}>
      {(formik) => (
        <Box component={Form} noValidate>
          {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>You have view-only access.</Alert>}
          {actionResult?.success && <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>}
          {actionResult && !actionResult.success && actionResult.message && <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>}

          {/* ── Intro ───────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "action.hover" }}>
            <Typography variant="subtitle2" gutterBottom>What is a service category?</Typography>
            <Typography variant="body2" color="text.secondary">
              Categories group related services together on the booking page (e.g. &quot;Hair&quot;, &quot;Nails&quot;, &quot;Massage&quot;).
              Customers browse by category to find the service they want. Services without a category appear under &quot;Other&quot;.
            </Typography>
          </Paper>

          {/* ── Name ────────────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Category Name</Typography>
            <VisibilityBadge visible />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Shown to customers as a section heading on the booking page (e.g. &quot;Hair Services&quot;, &quot;Body Treatments&quot;).
          </Typography>
          <Field name="name">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  formik.setFieldValue("name", e.target.value);
                  formik.setFieldValue("slug", generateTenantSlug(e.target.value));
                }}
                placeholder="e.g. Hair Services"
                fullWidth
                margin="dense"
                disabled={isPending || !canEdit}
                error={(!!formik.touched.name && !!formik.errors.name) || !!actionResult?.fieldErrors?.name}
                helperText={(formik.touched.name && formik.errors.name) || actionResult?.fieldErrors?.name}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
            )}
          </Field>

          {/* ── Slug (auto-generated, read-only) ──────────── */}
          <Field name="slug">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                fullWidth
                margin="dense"
                disabled
                helperText="Auto-generated from the name"
                slotProps={{ htmlInput: { maxLength: 63 } }}
                sx={{ mt: 1 }}
              />
            )}
          </Field>

          <Divider sx={{ my: 3 }} />

          {/* ── Description ─────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Description</Typography>
            <VisibilityBadge visible />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Optional text shown below the category heading on the booking page. Use it to give customers a quick overview of what this category includes.
          </Typography>
          <Field name="description">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                placeholder="e.g. Professional hair services including cuts, coloring, and styling."
                multiline
                minRows={2}
                maxRows={4}
                fullWidth
                margin="dense"
                disabled={isPending || !canEdit}
                error={!!formik.touched.description && !!formik.errors.description}
                helperText={(formik.touched.description && formik.errors.description) || `${(field.value ?? "").length} / 1000`}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
            )}
          </Field>

          <Divider sx={{ my: 3 }} />

          {/* ── Active toggle ───────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={<Switch checked={formik.values.isActive} onChange={(e) => formik.setFieldValue("isActive", e.target.checked)} disabled={isPending || !canEdit} />}
              label="Active"
            />
            <Typography variant="caption" color="text.secondary">
              Inactive categories and their services won&apos;t appear on the booking page.
            </Typography>
          </Stack>

          {/* ── Submit ──────────────────────────────────────── */}
          {canEdit && (
            <Box sx={{ mt: 3 }}>
              <Button type="submit" variant="contained" size="large" disabled={isPending || !formik.dirty}>
                {isPending ? "Saving..." : submitLabel}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Formik>
  );
}
