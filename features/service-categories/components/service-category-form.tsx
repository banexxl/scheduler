"use client";

import { useState, useRef, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { serviceCategorySchema, type ServiceCategoryFormValues } from "../schemas/service-category-schema";
import { generateTenantSlug } from "@/lib/tenants/generate-tenant-slug";

type ServiceCategoryFormProps = {
  initialValues: ServiceCategoryFormValues;
  onSubmit: (values: ServiceCategoryFormValues) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  canEdit: boolean;
};

export default function ServiceCategoryForm({ initialValues, onSubmit, submitLabel, canEdit }: ServiceCategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);
  const slugEdited = useRef<boolean | null>(null);
  if (slugEdited.current == null) slugEdited.current = initialValues.slug !== "";

  const handleSubmit = (values: ServiceCategoryFormValues, { resetForm }: { resetForm: (o: { values: ServiceCategoryFormValues }) => void }) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => { const r = await onSubmit(values); setActionResult(r); if (r.success) resetForm({ values }); });
  };

  return (
    <Formik initialValues={initialValues} validationSchema={serviceCategorySchema} onSubmit={handleSubmit} validateOnBlur validateOnChange={false}>
      {(formik) => (
        <Box component={Form} noValidate>
          {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>You have view-only access.</Alert>}
          {actionResult?.success && <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>}
          {actionResult && !actionResult.success && actionResult.message && <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>}

          <Field name="name">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { formik.setFieldValue("name", e.target.value); if (!slugEdited.current) formik.setFieldValue("slug", generateTenantSlug(e.target.value)); }}
                label="Category Name" placeholder="e.g. Hair, Massage, Consultations" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={(!!formik.touched.name && !!formik.errors.name) || !!actionResult?.fieldErrors?.name}
                helperText={(formik.touched.name && formik.errors.name) || actionResult?.fieldErrors?.name} slotProps={{ htmlInput: { maxLength: 120 } }} />
            )}
          </Field>

          <Field name="slug">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { slugEdited.current = true; formik.setFieldValue("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
                label="Slug" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={(!!formik.touched.slug && !!formik.errors.slug) || !!actionResult?.fieldErrors?.slug}
                helperText={(formik.touched.slug && formik.errors.slug) || actionResult?.fieldErrors?.slug || "Unique identifier within your business"} slotProps={{ htmlInput: { maxLength: 63 } }} />
            )}
          </Field>

          <Field name="description">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} label="Description (optional)" multiline minRows={2} maxRows={4} fullWidth margin="normal" disabled={isPending || !canEdit}
                error={!!formik.touched.description && !!formik.errors.description}
                helperText={(formik.touched.description && formik.errors.description) || `${(field.value ?? "").length} / 1000`}
                slotProps={{ htmlInput: { maxLength: 1000 } }} />
            )}
          </Field>

          <FormControlLabel control={<Switch checked={formik.values.isActive} onChange={(e) => formik.setFieldValue("isActive", e.target.checked)} disabled={isPending || !canEdit} />} label="Active" sx={{ mt: 1 }} />

          {canEdit && <Box sx={{ mt: 3 }}><Button type="submit" variant="contained" size="large" disabled={isPending || !formik.dirty}>{isPending ? "Saving..." : submitLabel}</Button></Box>}
        </Box>
      )}
    </Formik>
  );
}
