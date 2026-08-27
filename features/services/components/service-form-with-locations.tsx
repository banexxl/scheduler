"use client";

import { useState, useTransition } from "react";
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
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
import { serviceSchema, type ServiceFormValues } from "../schemas/service-schema";
import { generateTenantSlug } from "@/lib/tenants/generate-tenant-slug";
import type { ServiceCategory } from "@/features/service-categories/types/service-category";
import type { LocationListItem } from "@/features/locations/services/get-business-locations";
import type { Resource } from "@/features/resources/types/resource";
import type { ServiceResourceAssignmentInput } from "../types/service-resource";
import ServiceLocationPicker from "./service-location-picker";
import ServiceResourcePicker from "./service-resource-picker";
import { createServiceWithAssignmentsAction } from "../actions/create-service-with-assignments";

type ServiceFormWithLocationsProps = {
  initialValues: ServiceFormValues;
  submitLabel: string;
  canEdit: boolean;
  categories: ServiceCategory[];
  locations: LocationListItem[];
  resources: Resource[];
  tenantSlug: string;
};

function VisibilityBadge({ visible }: { visible: boolean }) {
  return visible ? (
    <Chip icon={<VisibilityIcon sx={{ fontSize: 14 }} />} label="Customer-visible" size="small" color="info" variant="outlined" sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }} />
  ) : (
    <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="Internal only" size="small" variant="outlined" sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }} />
  );
}

/**
 * Service creation form that includes location and resource assignment.
 * Uses createServiceWithAssignmentsAction to create everything atomically.
 */
export default function ServiceFormWithLocations({
  initialValues,
  submitLabel,
  canEdit,
  categories,
  locations,
  resources,
  tenantSlug,
}: ServiceFormWithLocationsProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [resourceAssignments, setResourceAssignments] = useState<ServiceResourceAssignmentInput[]>([]);

  const handleSubmit = (values: ServiceFormValues) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => {
      const r = await createServiceWithAssignmentsAction(tenantSlug, values, selectedLocationIds, resourceAssignments);
      setActionResult(r);
    });
  };

  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <Formik initialValues={initialValues} validationSchema={serviceSchema} onSubmit={handleSubmit} validateOnBlur validateOnChange={false}>
      {(formik) => (
        <Box component={Form} noValidate>
          {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>You have view-only access.</Alert>}
          {actionResult?.success && <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>}
          {actionResult && !actionResult.success && actionResult.message && <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>}

          {/* ── Intro ───────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "action.hover" }}>
            <Typography variant="subtitle2" gutterBottom>What is a service?</Typography>
            <Typography variant="body2" color="text.secondary">
              A service is something your customers can book — a haircut, a massage, a consultation, a room rental.
              Each service has a name, duration, and price. You assign it to locations where it is offered and
              to the resources (staff, rooms, equipment) that can deliver it.
            </Typography>
          </Paper>

          {/* ── Name ────────────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Service Name</Typography>
            <VisibilityBadge visible />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            The name customers see on the booking page and in confirmations (e.g. &quot;Classic Haircut&quot;, &quot;Deep Tissue Massage&quot;).
          </Typography>
          <Field name="name">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  formik.setFieldValue("name", e.target.value);
                  formik.setFieldValue("slug", generateTenantSlug(e.target.value));
                }}
                placeholder="e.g. Classic Haircut"
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

          {/* ── Category ────────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Category</Typography>
            <VisibilityBadge visible />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Groups services on the booking page (e.g. &quot;Hair&quot;, &quot;Nails&quot;, &quot;Massage&quot;). Optional — services without a category appear under &quot;Other&quot;.
            {" "}<Link href={`/${tenantSlug}/services/categories`} variant="caption">Create a new category</Link>
          </Typography>
          <Field name="serviceCategoryId">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                select
                fullWidth
                margin="dense"
                disabled={isPending || !canEdit}
                error={!!formik.touched.serviceCategoryId && !!formik.errors.serviceCategoryId}
                helperText={(formik.touched.serviceCategoryId && formik.errors.serviceCategoryId) || actionResult?.fieldErrors?.serviceCategoryId}
              >
                <MenuItem value="">Uncategorized</MenuItem>
                {activeCategories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            )}
          </Field>

          <Divider sx={{ my: 3 }} />

          {/* ── Description ─────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Description</Typography>
            <VisibilityBadge visible />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Shown to customers on the booking page. Describe what the service includes so customers know what to expect.
          </Typography>
          <Field name="description">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                placeholder="e.g. A precision haircut with consultation, wash, and styling."
                multiline
                minRows={2}
                maxRows={4}
                fullWidth
                margin="dense"
                disabled={isPending || !canEdit}
                slotProps={{ htmlInput: { maxLength: 2000 } }}
              />
            )}
          </Field>

          <Divider sx={{ my: 3 }} />

          {/* ── Duration ────────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Duration</Typography>
            <VisibilityBadge visible />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            How long the appointment lasts. Shown to customers and used to calculate available time slots.
          </Typography>
          <Field name="durationMinutes">
            {({ field }: { field: { name: string; value: string | number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                type="number"
                placeholder="e.g. 60"
                fullWidth
                margin="dense"
                disabled={isPending || !canEdit}
                error={!!formik.touched.durationMinutes && !!formik.errors.durationMinutes}
                helperText={(formik.touched.durationMinutes && formik.errors.durationMinutes) || "In minutes (5 to 1440)"}
                slotProps={{ htmlInput: { min: 5, max: 1440 } }}
                sx={{ maxWidth: 200 }}
              />
            )}
          </Field>

          <Divider sx={{ my: 3 }} />

          {/* ── Pricing ─────────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Pricing</Typography>
            <VisibilityBadge visible />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            The price shown to customers. Set to 0 for free services. The currency should match your business default.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Field name="price">
              {({ field }: { field: { name: string; value: string | number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Price"
                  type="number"
                  placeholder="e.g. 25"
                  fullWidth
                  margin="dense"
                  disabled={isPending || !canEdit}
                  error={!!formik.touched.price && !!formik.errors.price}
                  helperText={(formik.touched.price && formik.errors.price) || "0 for free services"}
                  slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                />
              )}
            </Field>
            <Field name="currency">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Currency"
                  placeholder="e.g. USD"
                  fullWidth
                  margin="dense"
                  disabled={isPending || !canEdit}
                  error={!!formik.touched.currency && !!formik.errors.currency}
                  helperText={(formik.touched.currency && formik.errors.currency) || "3-letter code (USD, EUR, AED...)"}
                  slotProps={{ htmlInput: { maxLength: 3, style: { textTransform: "uppercase" } } }}
                />
              )}
            </Field>
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* ── Buffers ─────────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">Buffer Times</Typography>
            <VisibilityBadge visible={false} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Extra time blocked before and after each appointment. Not shown to customers but prevents back-to-back bookings.
            Use for preparation, cleanup, or travel time.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Field name="bufferBeforeMinutes">
              {({ field }: { field: { name: string; value: string | number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Before (minutes)"
                  type="number"
                  placeholder="e.g. 10"
                  fullWidth
                  margin="dense"
                  disabled={isPending || !canEdit}
                  error={!!formik.touched.bufferBeforeMinutes && !!formik.errors.bufferBeforeMinutes}
                  helperText={(formik.touched.bufferBeforeMinutes && formik.errors.bufferBeforeMinutes) || "Prep time before appointment"}
                  slotProps={{ htmlInput: { min: 0, max: 1440 } }}
                />
              )}
            </Field>
            <Field name="bufferAfterMinutes">
              {({ field }: { field: { name: string; value: string | number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="After (minutes)"
                  type="number"
                  placeholder="e.g. 15"
                  fullWidth
                  margin="dense"
                  disabled={isPending || !canEdit}
                  error={!!formik.touched.bufferAfterMinutes && !!formik.errors.bufferAfterMinutes}
                  helperText={(formik.touched.bufferAfterMinutes && formik.errors.bufferAfterMinutes) || "Cleanup time after appointment"}
                  slotProps={{ htmlInput: { min: 0, max: 1440 } }}
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
              Inactive services won&apos;t appear on the booking page or in the calendar.
            </Typography>
          </Stack>

          {/* ── Location Assignments ────────────────────────── */}
          {locations.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2">Locations</Typography>
                <VisibilityBadge visible={false} />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Which locations offer this service. Customers only see this service at the locations you assign it to.
              </Typography>
              <ServiceLocationPicker
                locations={locations}
                selectedLocationIds={selectedLocationIds}
                onChange={setSelectedLocationIds}
                disabled={isPending}
                canEdit={canEdit}
              />
            </>
          )}

          {locations.length === 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2">Locations</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                No locations have been created yet. Create a location first to assign services to it.
              </Typography>
            </>
          )}

          {/* ── Resource Assignments ────────────────────────── */}
          {resources.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2">Resources</Typography>
                <VisibilityBadge visible={false} />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Which resources (staff, rooms, equipment) can deliver this service. Only assigned resources appear as options during booking.
              </Typography>
              <ServiceResourcePicker
                resources={resources}
                assignments={resourceAssignments}
                onChange={setResourceAssignments}
                disabled={isPending}
                canEdit={canEdit}
              />
            </>
          )}

          {resources.length === 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2">Resources</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                No resources have been created yet. Create a resource first to assign it to services.
              </Typography>
            </>
          )}

          {/* ── Submit ──────────────────────────────────────── */}
          {canEdit && (
            <Box sx={{ mt: 3 }}>
              <Button type="submit" variant="contained" size="large" disabled={isPending}>
                {isPending ? "Creating..." : submitLabel}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Formik>
  );
}
