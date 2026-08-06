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
import Checkbox from "@mui/material/Checkbox";
import FormGroup from "@mui/material/FormGroup";
import Typography from "@mui/material/Typography";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import { resourceSchema, type ResourceFormValues } from "../schemas/resource-schema";
import type { ResourceType } from "../types/resource";
import { generateTenantSlug } from "@/lib/tenants/generate-tenant-slug";

type LocationOption = { id: string; name: string };
type ResourceFormProps = {
  initialValues: ResourceFormValues;
  onSubmit: (values: ResourceFormValues) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  canEdit: boolean;
  resourceTypes: ResourceType[];
  locations: LocationOption[];
};

export default function ResourceForm({ initialValues, onSubmit, submitLabel, canEdit, resourceTypes, locations }: ResourceFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);
  const slugEdited = useRef<boolean | null>(null);
  if (slugEdited.current == null) slugEdited.current = initialValues.slug !== "";

  const handleSubmit = (values: ResourceFormValues, { resetForm }: { resetForm: (o: { values: ResourceFormValues }) => void }) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => { const r = await onSubmit(values); setActionResult(r); if (r.success) resetForm({ values }); });
  };

  const activeTypes = resourceTypes.filter((t) => t.isActive);

  return (
    <Formik initialValues={initialValues} validationSchema={resourceSchema} onSubmit={handleSubmit} validateOnBlur validateOnChange={false}>
      {(formik) => (
        <Box component={Form} noValidate>
          {actionResult?.success && <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>}
          {actionResult && !actionResult.success && actionResult.message && <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>}

          <Field name="name">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { formik.setFieldValue("name", e.target.value); if (!slugEdited.current) formik.setFieldValue("slug", generateTenantSlug(e.target.value)); }}
                label="Name" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={(!!formik.touched.name && !!formik.errors.name) || !!actionResult?.fieldErrors?.name}
                helperText={(formik.touched.name && formik.errors.name) || actionResult?.fieldErrors?.name} slotProps={{ htmlInput: { maxLength: 120 } }} />
            )}
          </Field>

          <Field name="slug">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { slugEdited.current = true; formik.setFieldValue("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
                label="Slug" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={(!!formik.touched.slug && !!formik.errors.slug) || !!actionResult?.fieldErrors?.slug}
                helperText={(formik.touched.slug && formik.errors.slug) || actionResult?.fieldErrors?.slug} slotProps={{ htmlInput: { maxLength: 63 } }} />
            )}
          </Field>

          <Field name="resourceTypeId">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} select label="Resource Type" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={!!formik.touched.resourceTypeId && !!formik.errors.resourceTypeId}
                helperText={formik.touched.resourceTypeId && formik.errors.resourceTypeId}>
                {activeTypes.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </TextField>
            )}
          </Field>

          <Field name="description">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} label="Description" multiline minRows={2} fullWidth margin="normal" disabled={isPending || !canEdit} slotProps={{ htmlInput: { maxLength: 2000 } }} />
            )}
          </Field>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Field name="email">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Email" type="email" fullWidth margin="normal" disabled={isPending || !canEdit}
                  error={!!formik.touched.email && !!formik.errors.email} helperText={formik.touched.email && formik.errors.email} />
              )}
            </Field>
            <Field name="phoneNumber">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Phone" fullWidth margin="normal" disabled={isPending || !canEdit}
                  error={!!formik.touched.phoneNumber && !!formik.errors.phoneNumber} helperText={formik.touched.phoneNumber && formik.errors.phoneNumber} />
              )}
            </Field>
          </Box>

          <FormControlLabel control={<Switch checked={formik.values.isActive} onChange={(e) => formik.setFieldValue("isActive", e.target.checked)} disabled={isPending || !canEdit} />} label="Active" sx={{ mt: 1, mb: 2 }} />

          {/* Location assignments */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Assigned Locations</Typography>
          {formik.touched.locationIds && formik.errors.locationIds && <Typography variant="caption" color="error">{formik.errors.locationIds}</Typography>}
          <FormGroup>
            {locations.map((loc) => (
              <FormControlLabel key={loc.id} disabled={isPending || !canEdit}
                control={<Checkbox checked={(formik.values.locationIds as string[]).includes(loc.id)} onChange={(e) => {
                  const current = formik.values.locationIds as string[];
                  const updated = e.target.checked ? [...current, loc.id] : current.filter((id) => id !== loc.id);
                  formik.setFieldValue("locationIds", updated);
                  if (!updated.includes(formik.values.primaryLocationId)) formik.setFieldValue("primaryLocationId", updated[0] ?? "");
                }} />}
                label={loc.name} />
            ))}
          </FormGroup>

          {/* Primary location */}
          {(formik.values.locationIds as string[]).length > 0 && (
            <FormControl sx={{ mt: 2 }} disabled={isPending || !canEdit}>
              <FormLabel>Primary Location</FormLabel>
              {formik.touched.primaryLocationId && formik.errors.primaryLocationId && <Typography variant="caption" color="error">{formik.errors.primaryLocationId}</Typography>}
              <RadioGroup value={formik.values.primaryLocationId} onChange={(e) => formik.setFieldValue("primaryLocationId", e.target.value)}>
                {(formik.values.locationIds as string[]).map((locId) => {
                  const loc = locations.find((l) => l.id === locId);
                  return <FormControlLabel key={locId} value={locId} control={<Radio />} label={loc?.name ?? locId} />;
                })}
              </RadioGroup>
            </FormControl>
          )}

          {canEdit && <Box sx={{ mt: 3 }}><Button type="submit" variant="contained" size="large" disabled={isPending || !formik.dirty}>{isPending ? "Saving..." : submitLabel}</Button></Box>}
        </Box>
      )}
    </Formik>
  );
}
