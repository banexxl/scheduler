"use client";

import { useState, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import { showActionToast } from "@/lib/hooks/use-action-toast";
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
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
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

function VisibilityBadge({ visible }: { visible: boolean }) {
  return visible ? (
    <Chip icon={<VisibilityIcon sx={{ fontSize: 14 }} />} label="Customer-visible" size="small" color="info" variant="outlined" sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }} />
  ) : (
    <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="Internal only" size="small" variant="outlined" sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }} />
  );
}

export default function ResourceForm({ initialValues, onSubmit, submitLabel, canEdit, resourceTypes, locations }: ResourceFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);

  const handleSubmit = (values: ResourceFormValues, { resetForm }: { resetForm: (o: { values: ResourceFormValues }) => void }) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => { const r = await onSubmit(values); setActionResult(r); showActionToast(r, "Resource saved!"); if (r.success) resetForm({ values }); });
  };

  const activeTypes = resourceTypes.filter((t) => t.isActive);

  return (
    <Formik initialValues={initialValues} validationSchema={resourceSchema} onSubmit={handleSubmit} validateOnBlur validateOnChange={false}>
      {(formik) => (
        <Box component={Form} noValidate>
          {actionResult?.success && <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>}
          {actionResult && !actionResult.success && actionResult.message && <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>}

          {/* ── Intro ───────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "action.hover" }}>
            <Typography variant="subtitle2" gutterBottom>What is a resource?</Typography>
            <Typography variant="body2" color="text.secondary">
              A resource is an individual person, room, or piece of equipment that delivers a service.
              Customers book time with a specific resource, or the system can auto-assign one based on availability.
              Each resource belongs to a resource type and is assigned to one or more locations.
            </Typography>
          </Paper>

          {/* ── Name ────────────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Name</Typography>
            <VisibilityBadge visible />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            The name shown to customers on the booking page when they choose a resource (e.g. &quot;Ana&quot;, &quot;Room 3&quot;, &quot;Laser Unit A&quot;).
          </Typography>
          <Field name="name">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  formik.setFieldValue("name", e.target.value);
                  formik.setFieldValue("slug", generateTenantSlug(e.target.value));
                }}
                placeholder="e.g. Ana, Room 3"
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

          {/* ── Resource Type ───────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Resource Type</Typography>
            <VisibilityBadge visible={false} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            The category this resource belongs to. Determines how it appears in scheduling and which services it can be assigned to.
          </Typography>
          <Field name="resourceTypeId">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                select
                fullWidth
                margin="dense"
                disabled={isPending || !canEdit}
                error={!!formik.touched.resourceTypeId && !!formik.errors.resourceTypeId}
                helperText={formik.touched.resourceTypeId && formik.errors.resourceTypeId}
              >
                {activeTypes.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    <Stack>
                      <Typography variant="body2">{t.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.displayNameSingular} ({t.resourceKind})</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Field>

          <Divider sx={{ my: 3 }} />

          {/* ── Description ─────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Description</Typography>
            <VisibilityBadge visible={false} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Internal notes about this resource. Not shown to customers. Use this for specialties, qualifications, or scheduling notes.
          </Typography>
          <Field name="description">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                placeholder="e.g. Senior barber, specializes in fades and beard styling"
                multiline
                minRows={2}
                fullWidth
                margin="dense"
                disabled={isPending || !canEdit}
                slotProps={{ htmlInput: { maxLength: 2000 } }}
              />
            )}
          </Field>

          <Divider sx={{ my: 3 }} />

          {/* ── Contact Info ─────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Contact Information</Typography>
            <VisibilityBadge visible={false} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Used internally for notifications and reminders. Not shown to customers. Leave blank if not applicable (e.g. for rooms or equipment).
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Field name="email">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  placeholder="e.g. ana@business.com"
                  fullWidth
                  margin="dense"
                  disabled={isPending || !canEdit}
                  error={!!formik.touched.email && !!formik.errors.email}
                  helperText={(formik.touched.email && formik.errors.email) || "For appointment notifications"}
                />
              )}
            </Field>
            <Field name="phoneNumber">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Phone"
                  placeholder="e.g. +381 61 123 4567"
                  fullWidth
                  margin="dense"
                  disabled={isPending || !canEdit}
                  error={!!formik.touched.phoneNumber && !!formik.errors.phoneNumber}
                  helperText={(formik.touched.phoneNumber && formik.errors.phoneNumber) || "For SMS reminders"}
                />
              )}
            </Field>
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* ── Active toggle ───────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={<Switch checked={formik.values.isActive} onChange={(e) => formik.setFieldValue("isActive", e.target.checked)} disabled={isPending || !canEdit} />}
              label="Active"
            />
            <Typography variant="caption" color="text.secondary">
              Inactive resources won&apos;t appear in the booking flow or calendar.
            </Typography>
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* ── Location Assignments ────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Assigned Locations</Typography>
            <VisibilityBadge visible={false} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Which locations this resource works at. A resource must be assigned to at least one location to appear in the booking flow for that location.
          </Typography>
          {formik.touched.locationIds && formik.errors.locationIds && (
            <Typography variant="caption" color="error" sx={{ display: "block", mb: 0.5 }}>{formik.errors.locationIds}</Typography>
          )}
          <FormGroup>
            {locations.map((loc) => (
              <FormControlLabel
                key={loc.id}
                disabled={isPending || !canEdit}
                control={
                  <Checkbox
                    checked={(formik.values.locationIds as string[]).includes(loc.id)}
                    onChange={(e) => {
                      const current = formik.values.locationIds as string[];
                      const updated = e.target.checked ? [...current, loc.id] : current.filter((id) => id !== loc.id);
                      formik.setFieldValue("locationIds", updated);
                      if (!updated.includes(formik.values.primaryLocationId)) formik.setFieldValue("primaryLocationId", updated[0] ?? "");
                    }}
                  />
                }
                label={loc.name}
              />
            ))}
          </FormGroup>

          {/* ── Primary Location ─────────────────────────────── */}
          {(formik.values.locationIds as string[]).length > 0 && (
            <>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, mb: 0.5 }}>
                <Typography variant="subtitle2">Primary Location</Typography>
                <VisibilityBadge visible={false} />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                The default location for this resource. Used when the system auto-assigns a resource and no location preference is specified.
              </Typography>
              {formik.touched.primaryLocationId && formik.errors.primaryLocationId && (
                <Typography variant="caption" color="error" sx={{ display: "block", mb: 0.5 }}>{formik.errors.primaryLocationId}</Typography>
              )}
              <FormControl disabled={isPending || !canEdit}>
                <RadioGroup value={formik.values.primaryLocationId} onChange={(e) => formik.setFieldValue("primaryLocationId", e.target.value)}>
                  {(formik.values.locationIds as string[]).map((locId) => {
                    const loc = locations.find((l) => l.id === locId);
                    return <FormControlLabel key={locId} value={locId} control={<Radio />} label={loc?.name ?? locId} />;
                  })}
                </RadioGroup>
              </FormControl>
            </>
          )}

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
