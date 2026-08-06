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
import type { LocationListItem } from "@/features/locations/services/get-business-locations";
import type { Resource } from "@/features/resources/types/resource";
import type { ServiceResourceAssignmentInput } from "../types/service-resource";
import ServiceLocationPicker from "./service-location-picker";
import ServiceResourcePicker from "./service-resource-picker";

type ServiceFormProps = {
  initialValues: ServiceFormValues;
  onSubmit: (values: ServiceFormValues) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  canEdit: boolean;
  categories: ServiceCategory[];
  /** All tenant locations for the assignment picker */
  locations?: LocationListItem[];
  /** Currently assigned location IDs (edit mode) */
  assignedLocationIds?: string[];
  /** Callback to save location assignments after service save */
  onLocationsSave?: (locationIds: string[]) => Promise<{ success: boolean; message?: string }>;
  /** All tenant resources for the assignment picker */
  resources?: Resource[];
  /** Currently assigned resource data (edit mode) */
  assignedResources?: ServiceResourceAssignmentInput[];
  /** Callback to save resource assignments after service save */
  onResourcesSave?: (assignments: ServiceResourceAssignmentInput[]) => Promise<{ success: boolean; message?: string }>;
};

export default function ServiceForm({ initialValues, onSubmit, submitLabel, canEdit, categories, locations, assignedLocationIds, onLocationsSave, resources, assignedResources, onResourcesSave }: ServiceFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(assignedLocationIds ?? []);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [resourceAssignments, setResourceAssignments] = useState<ServiceResourceAssignmentInput[]>(assignedResources ?? []);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const slugEdited = useRef<boolean | null>(null);
  if (slugEdited.current == null) slugEdited.current = initialValues.slug !== "";

  const handleSubmit = (values: ServiceFormValues, { resetForm }: { resetForm: (o: { values: ServiceFormValues }) => void }) => {
    if (!canEdit) return;
    setActionResult(null);
    setLocationError(null);
    setResourceError(null);
    startTransition(async () => {
      const r = await onSubmit(values);
      if (r.success && onLocationsSave) {
        const locResult = await onLocationsSave(selectedLocationIds);
        if (!locResult.success) {
          setLocationError(locResult.message ?? "Unable to save location assignments.");
          setActionResult({ success: true, message: "Service saved, but location assignments failed." });
          return;
        }
      }
      if (r.success && onResourcesSave) {
        const resResult = await onResourcesSave(resourceAssignments);
        if (!resResult.success) {
          setResourceError(resResult.message ?? "Unable to save resource assignments.");
          setActionResult({ success: true, message: "Service saved, but resource assignments failed." });
          return;
        }
      }
      setActionResult(r);
      if (r.success) resetForm({ values });
    });
  };

  const activeCategories = categories.filter((c) => c.isActive);

  const locationsChanged = () => {
    const initial = new Set(assignedLocationIds ?? []);
    const current = new Set(selectedLocationIds);
    if (initial.size !== current.size) return true;
    for (const id of initial) {
      if (!current.has(id)) return true;
    }
    return false;
  };

  const resourcesChanged = () => {
    const initial = assignedResources ?? [];
    if (initial.length !== resourceAssignments.length) return true;
    return JSON.stringify(initial) !== JSON.stringify(resourceAssignments);
  };

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

          {locations && locations.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Locations</Typography>
              <ServiceLocationPicker
                locations={locations}
                selectedLocationIds={selectedLocationIds}
                onChange={setSelectedLocationIds}
                disabled={isPending}
                canEdit={canEdit}
                error={locationError}
              />
            </>
          )}

          {locations && locations.length === 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Locations</Typography>
              <Typography variant="body2" color="text.secondary">
                No locations have been created yet. Create a location first to assign services to it.
              </Typography>
            </>
          )}

          {resources && resources.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Resources</Typography>
              <ServiceResourcePicker
                resources={resources}
                assignments={resourceAssignments}
                onChange={setResourceAssignments}
                disabled={isPending}
                canEdit={canEdit}
                error={resourceError}
              />
            </>
          )}

          {resources && resources.length === 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Resources</Typography>
              <Typography variant="body2" color="text.secondary">
                No resources have been created yet. Create a resource first to assign it to services.
              </Typography>
            </>
          )}

          {canEdit && <Box sx={{ mt: 3 }}><Button type="submit" variant="contained" size="large" disabled={isPending || (!formik.dirty && !locationsChanged() && !resourcesChanged())}>{isPending ? "Saving..." : submitLabel}</Button></Box>}
        </Box>
      )}
    </Formik>
  );
}
