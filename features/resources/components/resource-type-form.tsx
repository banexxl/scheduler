"use client";

import { useState, useRef, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import { showActionToast } from "@/lib/hooks/use-action-toast";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { resourceTypeSchema, type ResourceTypeFormValues } from "../schemas/resource-type-schema";
import { RESOURCE_KINDS, RESOURCE_KIND_LABELS } from "../types/resource";
import { generateTenantSlug } from "@/lib/tenants/generate-tenant-slug";

type ResourceTypeFormProps = {
  initialValues: ResourceTypeFormValues;
  onSubmit: (values: ResourceTypeFormValues) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  canEdit: boolean;
};

export default function ResourceTypeForm({ initialValues, onSubmit, submitLabel, canEdit }: ResourceTypeFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);
  const slugEdited = useRef<boolean | null>(null);
  if (slugEdited.current == null) slugEdited.current = initialValues.slug !== "";

  const handleSubmit = (values: ResourceTypeFormValues, { resetForm }: { resetForm: (o: { values: ResourceTypeFormValues }) => void }) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => { const r = await onSubmit(values); setActionResult(r); showActionToast(r, "Resource type saved!"); if (r.success) resetForm({ values }); });
  };

  return (
    <Formik initialValues={initialValues} validationSchema={resourceTypeSchema} onSubmit={handleSubmit} validateOnBlur validateOnChange={false}>
      {(formik) => (
        <Box component={Form} noValidate>
          {actionResult?.success && <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>}
          {actionResult && !actionResult.success && actionResult.message && <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>}

          <Field name="name">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { formik.setFieldValue("name", e.target.value); if (!slugEdited.current) formik.setFieldValue("slug", generateTenantSlug(e.target.value)); }}
                label="Name" placeholder="e.g. Barbers" fullWidth margin="normal" disabled={isPending || !canEdit}
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

          <Field name="resourceKind">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} select label="Resource Kind" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={!!formik.touched.resourceKind && !!formik.errors.resourceKind} helperText={formik.touched.resourceKind && formik.errors.resourceKind}>
                {RESOURCE_KINDS.map((k) => <MenuItem key={k} value={k}>{RESOURCE_KIND_LABELS[k]}</MenuItem>)}
              </TextField>
            )}
          </Field>

          <Field name="displayNameSingular">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} label="Singular Label" placeholder="e.g. Barber" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={!!formik.touched.displayNameSingular && !!formik.errors.displayNameSingular} helperText={formik.touched.displayNameSingular && formik.errors.displayNameSingular} />
            )}
          </Field>

          <Field name="displayNamePlural">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} label="Plural Label" placeholder="e.g. Barbers" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={!!formik.touched.displayNamePlural && !!formik.errors.displayNamePlural} helperText={formik.touched.displayNamePlural && formik.errors.displayNamePlural} />
            )}
          </Field>

          <Field name="description">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} label="Description" multiline minRows={2} fullWidth margin="normal" disabled={isPending || !canEdit} slotProps={{ htmlInput: { maxLength: 2000 } }} />
            )}
          </Field>

          <FormControlLabel control={<Switch checked={formik.values.isActive} onChange={(e) => formik.setFieldValue("isActive", e.target.checked)} disabled={isPending || !canEdit} />} label="Active" sx={{ mt: 1 }} />

          {canEdit && <Box sx={{ mt: 3 }}><Button type="submit" variant="contained" size="large" disabled={isPending || !formik.dirty}>{isPending ? "Saving..." : submitLabel}</Button></Box>}
        </Box>
      )}
    </Formik>
  );
}
