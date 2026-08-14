"use client";

import { useState, useCallback, useRef, useTransition } from "react";
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
import { locationSchema, type LocationFormValues, LOCATION_TYPES } from "../schemas/location-schema";
import { generateLocationSlug } from "../utils/location-slug";
import { TIMEZONE_LIST } from "@/features/business/utils/timezone-list";

const LOCATION_TYPE_LABELS: Record<string, string> = {
  physical: "Physical location",
  online: "Online",
  customer_address: "Customer's address",
};

type LocationFormProps = {
  initialValues: LocationFormValues;
  onSubmit: (values: LocationFormValues) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  canEdit: boolean;
};

export default function LocationForm({
  initialValues,
  onSubmit,
  submitLabel,
  canEdit,
}: LocationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message?: string;
    fieldErrors?: Record<string, string>;
  } | null>(null);

  const slugManuallyEdited = useRef<boolean | null>(null);
  if (slugManuallyEdited.current == null) {
    slugManuallyEdited.current = initialValues.slug !== "";
  }

  // Group timezones
  const groupedTimezones: Array<[string, typeof TIMEZONE_LIST]> = [];
  const groupMap = new Map<string, (typeof TIMEZONE_LIST)[number][]>();
  for (const tz of TIMEZONE_LIST) {
    const existing = groupMap.get(tz.group);
    if (existing) {
      existing.push(tz);
    } else {
      const arr = [tz];
      groupMap.set(tz.group, arr);
      groupedTimezones.push([tz.group, arr]);
    }
  }

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, setFieldValue: (field: string, value: string) => void) => {
      const newName = e.target.value;
      setFieldValue("name", newName);
      if (!slugManuallyEdited.current) {
        setFieldValue("slug", generateLocationSlug(newName));
      }
    },
    []
  );

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, setFieldValue: (field: string, value: string) => void) => {
      slugManuallyEdited.current = true;
      const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      setFieldValue("slug", raw);
    },
    []
  );

  const handleFormSubmit = (
    values: LocationFormValues,
    { resetForm }: { resetForm: (opts: { values: LocationFormValues }) => void }
  ) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => {
      const result = await onSubmit(values);
      setActionResult(result);
      showActionToast(result, "Location saved!");
      if (result.success) {
        resetForm({ values });
      }
    });
  };

  return (
    <Formik<LocationFormValues>
      initialValues={initialValues}
      validationSchema={locationSchema}
      onSubmit={handleFormSubmit}
      validateOnBlur
      validateOnChange={false}
    >
      {(formik) => {
        const isDisabled = isPending || !canEdit;

        return (
          <Box component={Form} noValidate>
            {!canEdit && (
              <Alert severity="info" sx={{ mb: 3 }}>
                You have view-only access. Contact the business owner to request changes.
              </Alert>
            )}

            {actionResult?.success && (
              <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>
            )}
            {actionResult && !actionResult.success && actionResult.message && (
              <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>
            )}

            <Typography variant="h6" sx={{ mb: 1 }}>Basic Information</Typography>

            <Field name="name">
              {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleNameChange(e, formik.setFieldValue)
                  }
                  label="Location Name"
                  placeholder="e.g. Belgrade Center"
                  fullWidth
                  margin="normal"
                  error={(!!formik.touched.name && !!formik.errors.name) || !!actionResult?.fieldErrors?.name}
                  helperText={(formik.touched.name && formik.errors.name) || actionResult?.fieldErrors?.name}
                  disabled={isDisabled}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                />
              )}
            </Field>

            <Field name="slug">
              {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleSlugChange(e, formik.setFieldValue)
                  }
                  label="Location Address (slug)"
                  placeholder="e.g. belgrade-center"
                  fullWidth
                  margin="normal"
                  error={(!!formik.touched.slug && !!formik.errors.slug) || !!actionResult?.fieldErrors?.slug}
                  helperText={(formik.touched.slug && formik.errors.slug) || actionResult?.fieldErrors?.slug || "Unique within your business"}
                  disabled={isDisabled}
                  slotProps={{ htmlInput: { maxLength: 63 } }}
                />
              )}
            </Field>

            <Field name="locationType">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  select
                  label="Location Type"
                  fullWidth
                  margin="normal"
                  error={!!formik.touched.locationType && !!formik.errors.locationType}
                  helperText={formik.touched.locationType && formik.errors.locationType}
                  disabled={isDisabled}
                >
                  {LOCATION_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {LOCATION_TYPE_LABELS[type] ?? type}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Field>

            <Field name="description">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Description"
                  multiline
                  minRows={2}
                  maxRows={5}
                  fullWidth
                  margin="normal"
                  error={!!formik.touched.description && !!formik.errors.description}
                  helperText={formik.touched.description && formik.errors.description}
                  disabled={isDisabled}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                />
              )}
            </Field>

            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Address</Typography>

            <Field name="streetAddress">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Street Address" fullWidth margin="normal" disabled={isDisabled}
                  error={!!formik.touched.streetAddress && !!formik.errors.streetAddress}
                  helperText={formik.touched.streetAddress && formik.errors.streetAddress} />
              )}
            </Field>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Field name="city">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="City" fullWidth margin="normal" disabled={isDisabled}
                    error={!!formik.touched.city && !!formik.errors.city}
                    helperText={formik.touched.city && formik.errors.city} />
                )}
              </Field>
              <Field name="provinceState">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="Province/State" fullWidth margin="normal" disabled={isDisabled}
                    error={!!formik.touched.provinceState && !!formik.errors.provinceState}
                    helperText={formik.touched.provinceState && formik.errors.provinceState} />
                )}
              </Field>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Field name="country">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="Country" fullWidth margin="normal" disabled={isDisabled}
                    error={!!formik.touched.country && !!formik.errors.country}
                    helperText={formik.touched.country && formik.errors.country} />
                )}
              </Field>
              <Field name="postalCode">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="Postal Code" fullWidth margin="normal" disabled={isDisabled}
                    error={!!formik.touched.postalCode && !!formik.errors.postalCode}
                    helperText={formik.touched.postalCode && formik.errors.postalCode} />
                )}
              </Field>
            </Box>

            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Contact & Settings</Typography>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Field name="phoneNumber">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="Phone" fullWidth margin="normal" disabled={isDisabled}
                    error={!!formik.touched.phoneNumber && !!formik.errors.phoneNumber}
                    helperText={formik.touched.phoneNumber && formik.errors.phoneNumber} />
                )}
              </Field>
              <Field name="email">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField {...field} label="Email" type="email" fullWidth margin="normal" disabled={isDisabled}
                    error={!!formik.touched.email && !!formik.errors.email}
                    helperText={formik.touched.email && formik.errors.email} />
                )}
              </Field>
            </Box>

            <Field name="timezone">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  select
                  label="Timezone"
                  fullWidth
                  margin="normal"
                  error={!!formik.touched.timezone && !!formik.errors.timezone}
                  helperText={formik.touched.timezone && formik.errors.timezone}
                  disabled={isDisabled}
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

            <FormControlLabel
              control={
                <Switch
                  checked={formik.values.isActive}
                  onChange={(e) => formik.setFieldValue("isActive", e.target.checked)}
                  disabled={isDisabled}
                />
              }
              label="Active"
              sx={{ mt: 1 }}
            />

            {canEdit && (
              <Box sx={{ mt: 3 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isPending || !formik.dirty}
                >
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
