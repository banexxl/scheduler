"use client";

import { useState, useRef, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { serviceSchema, type ServiceFormValues } from "../schemas/service-schema";
import { generateTenantSlug } from "@/lib/tenants/generate-tenant-slug";
import type { ServiceCategory } from "@/features/service-categories/types/service-category";

type ServiceFormProps = {
  initialValues: ServiceFormValues;
  onSubmit: (values: ServiceFormValues) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  canEdit: boolean;
  categories: ServiceCategory[];
};

export default function ServiceForm({ initialValues, onSubmit, submitLabel, canEdit, categories }: ServiceFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);
  const slugEdited = useRef<boolean | null>(null);
  if (slugEdited.current == null) slugEdited.current = initialValues.slug !== "";

  const handleSubmit = (values: ServiceFormValues, { resetForm }: { resetForm: (o: { values: ServiceFormValues }) => void }) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => { const r = await onSubmit(values); setActionResult(r); if (r.success) resetForm({ values }); });
  };

  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <Formik initialValues={initialValues} validationSchema={serviceSchema} onSubmit={handleSubmit} validateOnBlur validateOnChange={false}>
      {(formik) => (
        <Box component={Form} noValidate>
          {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>You have view-only access.</Alert>}
          {actionResult?.success && <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>}
          {actionResult && !actionResult.success && actionResult.message && <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>}

          <Typography variant="h6" sx={{ mb: 1 }}>Basic Information</Typography>

          <Field name="name">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { formik.setFieldValue("name", e.target.value); if (!slugEdited.current) formik.setFieldValue("slug", generateTenantSlug(e.target.value)); }}
                label="Service Name" placeholder="e.g. Classic Haircut" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={(!!formik.touched.name && !!formik.errors.name) || !!actionResult?.fieldErrors?.name}
                helperText={(formik.touched.name && formik.errors.name) || actionResult?.fieldErrors?.name} slotProps={{ htmlInput: { maxLength: 120 } }} />
            )}
          </Field>

          <Field name="slug">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { slugEdited.current = true; formik.setFieldValue("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
                label="Slug" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={(!!formik.touched.slug && !!formik.errors.slug) || !!actionResult?.fieldErrors?.slug}
                helperText={(formik.touched.slug && formik.errors.slug) || actionResult?.fieldErrors?.slug || "Unique identifier"} slotProps={{ htmlInput: { maxLength: 63 } }} />
            )}
          </Field>

          <Field name="serviceCategoryId">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} value={field.value ?? ""} select label="Category (optional)" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={!!formik.touched.serviceCategoryId && !!formik.errors.serviceCategoryId}
                helperText={(formik.touched.serviceCategoryId && formik.errors.serviceCategoryId) || actionResult?.fieldErrors?.serviceCategoryId}>
                <MenuItem value="">Uncategorized</MenuItem>
                {activeCategories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            )}
          </Field>

          <Field name="description">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} label="Description (optional)" multiline minRows={2} maxRows={4} fullWidth margin="normal" disabled={isPending || !canEdit} slotProps={{ htmlInput: { maxLength: 2000 } }} />
            )}
          </Field>

          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>Duration &amp; Pricing</Typography>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Field name="durationMinutes">
              {({ field }: { field: { name: string; value: string | number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Duration (minutes)" type="number" fullWidth margin="normal" disabled={isPending || !canEdit}
                  error={!!formik.touched.durationMinutes && !!formik.errors.durationMinutes}
                  helperText={(formik.touched.durationMinutes && formik.errors.durationMinutes) || "5–1440 min"} slotProps={{ htmlInput: { min: 5, max: 1440 } }} />
              )}
            </Field>
            <Field name="price">
              {({ field }: { field: { name: string; value: string | number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Price" type="number" fullWidth margin="normal" disabled={isPending || !canEdit}
                  error={!!formik.touched.price && !!formik.errors.price}
                  helperText={formik.touched.price && formik.errors.price} slotProps={{ htmlInput: { min: 0, step: "0.01" } }} />
              )}
            </Field>
            <Field name="currency">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Currency" fullWidth margin="normal" disabled={isPending || !canEdit}
                  error={!!formik.touched.currency && !!formik.errors.currency}
                  helperText={formik.touched.currency && formik.errors.currency} slotProps={{ htmlInput: { maxLength: 3, style: { textTransform: "uppercase" } } }} />
              )}
            </Field>
          </Box>

          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>Buffers</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Time reserved before and after appointments for preparation or cleanup.</Typography>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Field name="bufferBeforeMinutes">
              {({ field }: { field: { name: string; value: string | number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Buffer Before (min)" type="number" fullWidth margin="normal" disabled={isPending || !canEdit}
                  error={!!formik.touched.bufferBeforeMinutes && !!formik.errors.bufferBeforeMinutes}
                  helperText={formik.touched.bufferBeforeMinutes && formik.errors.bufferBeforeMinutes} slotProps={{ htmlInput: { min: 0, max: 1440 } }} />
              )}
            </Field>
            <Field name="bufferAfterMinutes">
              {({ field }: { field: { name: string; value: string | number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Buffer After (min)" type="number" fullWidth margin="normal" disabled={isPending || !canEdit}
                  error={!!formik.touched.bufferAfterMinutes && !!formik.errors.bufferAfterMinutes}
                  helperText={formik.touched.bufferAfterMinutes && formik.errors.bufferAfterMinutes} slotProps={{ htmlInput: { min: 0, max: 1440 } }} />
              )}
            </Field>
          </Box>

          <FormControlLabel control={<Switch checked={formik.values.isActive} onChange={(e) => formik.setFieldValue("isActive", e.target.checked)} disabled={isPending || !canEdit} />} label="Active" sx={{ mt: 2 }} />

          {canEdit && <Box sx={{ mt: 3 }}><Button type="submit" variant="contained" size="large" disabled={isPending || !formik.dirty}>{isPending ? "Saving..." : submitLabel}</Button></Box>}
        </Box>
      )}
    </Formik>
  );
}
