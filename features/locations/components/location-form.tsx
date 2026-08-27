"use client";

import { useState, useCallback, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import { showActionToast } from "@/lib/hooks/use-action-toast";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import ListSubheader from "@mui/material/ListSubheader";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
import { locationSchema, type LocationFormValues, LOCATION_TYPES } from "../schemas/location-schema";
import { generateLocationSlug } from "../utils/location-slug";
import { TIMEZONE_LIST } from "@/features/business/utils/timezone-list";

const LOCATION_TYPE_LABELS: Record<string, string> = {
  physical: "Physical location",
  online: "Online",
  customer_address: "Customer's address",
};

const LOCATION_TYPE_DESCRIPTIONS: Record<string, string> = {
  physical: "A brick-and-mortar place customers visit — a salon, office, clinic, studio.",
  online: "Services delivered remotely via video call or phone.",
  customer_address: "You travel to the customer's location (mobile services, home visits).",
};

type LocationFormProps = {
  initialValues: LocationFormValues;
  onSubmit: (values: LocationFormValues) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
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

export default function LocationForm({ initialValues, onSubmit, submitLabel, canEdit }: LocationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);

  // Group timezones
  const groupedTimezones: Array<[string, typeof TIMEZONE_LIST]> = [];
  const groupMap = new Map<string, (typeof TIMEZONE_LIST)[number][]>();
  for (const tz of TIMEZONE_LIST) {
    const existing = groupMap.get(tz.group);
    if (existing) { existing.push(tz); }
    else { const arr = [tz]; groupMap.set(tz.group, arr); groupedTimezones.push([tz.group, arr]); }
  }

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, setFieldValue: (field: string, value: string) => void) => {
      setFieldValue("name", e.target.value);
      setFieldValue("slug", generateLocationSlug(e.target.value));
    }, []
  );

  const handleFormSubmit = (values: LocationFormValues, { resetForm }: { resetForm: (opts: { values: LocationFormValues }) => void }) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => {
      const result = await onSubmit(values);
      setActionResult(result);
      showActionToast(result, "Location saved!");
      if (result.success) resetForm({ values });
    });
  };

  return (
    <Formik<LocationFormValues> initialValues={initialValues} validationSchema={locationSchema} onSubmit={handleFormSubmit} validateOnBlur validateOnChange={false}>
      {(formik) => {
        const isDisabled = isPending || !canEdit;

        return (
          <Box component={Form} noValidate>
            {!canEdit && <Alert severity="info" sx={{ mb: 3 }}>You have view-only access. Contact the business owner to request changes.</Alert>}
            {actionResult?.success && <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>}
            {actionResult && !actionResult.success && actionResult.message && <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>}

            {/* ── Intro ───────────────────────────────────────── */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "action.hover" }}>
              <Typography variant="subtitle2" gutterBottom>What is a location?</Typography>
              <Typography variant="body2" color="text.secondary">
                A location is a place where your business operates — a physical address, an online meeting room,
                or the customer&apos;s own address for mobile services. Each location has its own working hours,
                resources, and services. Customers choose a location when booking.
              </Typography>
            </Paper>

            {/* ── Name ────────────────────────────────────────── */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2">Location Name</Typography>
              <VisibilityBadge visible />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Shown to customers when they choose where to book (e.g. &quot;Downtown Studio&quot;, &quot;Belgrade Center&quot;).
            </Typography>
            <Field name="name">
              {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e, formik.setFieldValue)}
                  placeholder="e.g. Belgrade Center"
                  fullWidth
                  margin="dense"
                  error={(!!formik.touched.name && !!formik.errors.name) || !!actionResult?.fieldErrors?.name}
                  helperText={(formik.touched.name && formik.errors.name) || actionResult?.fieldErrors?.name}
                  disabled={isDisabled}
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

            {/* ── Location Type ──────────────────────────────── */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2">Location Type</Typography>
              <VisibilityBadge visible={false} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Determines how the location is treated in scheduling. Affects whether address fields are required and how customers see it.
            </Typography>
            <Field name="locationType">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} select fullWidth margin="dense" disabled={isDisabled}
                  error={!!formik.touched.locationType && !!formik.errors.locationType}
                  helperText={formik.touched.locationType && formik.errors.locationType}
                >
                  {LOCATION_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      <Stack>
                        <Typography variant="body2">{LOCATION_TYPE_LABELS[type] ?? type}</Typography>
                        <Typography variant="caption" color="text.secondary">{LOCATION_TYPE_DESCRIPTIONS[type]}</Typography>
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
              <VisibilityBadge visible />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Shown to customers on the booking page. Describe the location, parking, access instructions, etc.
            </Typography>
            <Field name="description">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  placeholder="e.g. Ground floor, free street parking available."
                  multiline
                  minRows={2}
                  maxRows={5}
                  fullWidth
                  margin="dense"
                  error={!!formik.touched.description && !!formik.errors.description}
                  helperText={formik.touched.description && formik.errors.description}
                  disabled={isDisabled}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                />
              )}
            </Field>

            <Divider sx={{ my: 3 }} />

            {/* ── Address ─────────────────────────────────────── */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2">Address</Typography>
              <VisibilityBadge visible />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Shown to customers in booking confirmations and on the public site. Leave blank for online or mobile locations.
            </Typography>

            <Field name="streetAddress">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Street Address" placeholder="e.g. 123 Main Street" fullWidth margin="dense" disabled={isDisabled}
                  error={!!formik.touched.streetAddress && !!formik.errors.streetAddress}
                  helperText={formik.touched.streetAddress && formik.errors.streetAddress} />
              )}
            </Field>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Field name="city">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="City" fullWidth margin="dense" disabled={isDisabled}
                    error={!!formik.touched.city && !!formik.errors.city}
                    helperText={formik.touched.city && formik.errors.city} />
                )}
              </Field>
              <Field name="provinceState">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="Province / State" fullWidth margin="dense" disabled={isDisabled}
                    error={!!formik.touched.provinceState && !!formik.errors.provinceState}
                    helperText={formik.touched.provinceState && formik.errors.provinceState} />
                )}
              </Field>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Field name="country">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="Country" fullWidth margin="dense" disabled={isDisabled}
                    error={!!formik.touched.country && !!formik.errors.country}
                    helperText={formik.touched.country && formik.errors.country} />
                )}
              </Field>
              <Field name="postalCode">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="Postal Code" fullWidth margin="dense" disabled={isDisabled}
                    error={!!formik.touched.postalCode && !!formik.errors.postalCode}
                    helperText={formik.touched.postalCode && formik.errors.postalCode} />
                )}
              </Field>
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* ── Contact ─────────────────────────────────────── */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2">Contact Information</Typography>
              <VisibilityBadge visible />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Shown to customers in booking confirmations. Also used for location-specific notifications.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Field name="phoneNumber">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="Phone" placeholder="e.g. +381 11 123 4567" fullWidth margin="dense" disabled={isDisabled}
                    error={!!formik.touched.phoneNumber && !!formik.errors.phoneNumber}
                    helperText={(formik.touched.phoneNumber && formik.errors.phoneNumber) || "For customer inquiries"} />
                )}
              </Field>
              <Field name="email">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="Email" type="email" placeholder="e.g. center@business.com" fullWidth margin="dense" disabled={isDisabled}
                    error={!!formik.touched.email && !!formik.errors.email}
                    helperText={(formik.touched.email && formik.errors.email) || "For booking confirmations"} />
                )}
              </Field>
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* ── Timezone ────────────────────────────────────── */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2">Timezone</Typography>
              <VisibilityBadge visible={false} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Controls working hours and availability calculations for this location. Customers see appointment times in their own timezone.
            </Typography>
            <Field name="timezone">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} select fullWidth margin="dense" disabled={isDisabled}
                  error={!!formik.touched.timezone && !!formik.errors.timezone}
                  helperText={formik.touched.timezone && formik.errors.timezone}
                >
                  {groupedTimezones.map(([group, tzList]) => [
                    <ListSubheader key={`group-${group}`}>{group}</ListSubheader>,
                    ...tzList.map((tz) => (
                      <MenuItem key={tz.value} value={tz.value}>{tz.label}</MenuItem>
                    )),
                  ])}
                </TextField>
              )}
            </Field>

            <Divider sx={{ my: 3 }} />

            {/* ── Active toggle ───────────────────────────────── */}
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControlLabel
                control={<Switch checked={formik.values.isActive} onChange={(e) => formik.setFieldValue("isActive", e.target.checked)} disabled={isDisabled} />}
                label="Active"
              />
              <Typography variant="caption" color="text.secondary">
                Inactive locations won&apos;t appear on the booking page or accept new appointments.
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
        );
      }}
    </Formik>
  );
}
