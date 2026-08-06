"use client";

import { useState, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { resourceTimeOffSchema } from "../schemas/resource-time-off-schema";

type LocationOption = { id: string; name: string };

type TimeOffFormValues = {
  resourceId: string;
  locationId: string;
  title: string;
  notes: string;
  isAllDay: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
};

type ResourceTimeOffFormProps = {
  initialValues: TimeOffFormValues;
  onSubmit: (values: Record<string, unknown>) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  canEdit: boolean;
  locations: LocationOption[];
};

export default function ResourceTimeOffForm({
  initialValues,
  onSubmit,
  submitLabel,
  canEdit,
  locations,
}: ResourceTimeOffFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);

  const handleSubmit = (values: TimeOffFormValues) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => {
      const r = await onSubmit(values);
      setActionResult(r);
    });
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={resourceTimeOffSchema}
      onSubmit={handleSubmit}
      validateOnBlur
      validateOnChange={false}
    >
      {(formik) => (
        <Box component={Form} noValidate>
          {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>You have view-only access.</Alert>}
          {actionResult?.success && <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>}
          {actionResult && !actionResult.success && actionResult.message && (
            <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>
          )}

          <Field name="title">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                label="Title (optional)"
                placeholder="e.g. Vacation, Sick day"
                fullWidth
                margin="normal"
                disabled={isPending || !canEdit}
                error={(!!formik.touched.title && !!formik.errors.title) || !!actionResult?.fieldErrors?.title}
                helperText={(formik.touched.title && formik.errors.title) || actionResult?.fieldErrors?.title}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
            )}
          </Field>

          <Field name="notes">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                label="Notes (optional)"
                multiline
                minRows={2}
                maxRows={4}
                fullWidth
                margin="normal"
                disabled={isPending || !canEdit}
                slotProps={{ htmlInput: { maxLength: 2000 } }}
              />
            )}
          </Field>

          {locations.length > 0 && (
            <Field name="locationId">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  value={field.value ?? ""}
                  select
                  label="Location (optional)"
                  fullWidth
                  margin="normal"
                  disabled={isPending || !canEdit}
                  helperText="Leave blank to block all locations"
                >
                  <MenuItem value="">All locations (global)</MenuItem>
                  {locations.map((loc) => (
                    <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
                  ))}
                </TextField>
              )}
            </Field>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={formik.values.isAllDay}
                onChange={(e) => formik.setFieldValue("isAllDay", e.target.checked)}
                disabled={isPending || !canEdit}
              />
            }
            label="Full day"
            sx={{ mt: 1, mb: 1 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {formik.values.isAllDay
              ? "Select start and end dates. The end date is inclusive."
              : "Select date and time range."}
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Field name="startDate">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Start date"
                  type="date"
                  margin="normal"
                  disabled={isPending || !canEdit}
                  error={!!formik.touched.startDate && !!formik.errors.startDate}
                  helperText={formik.touched.startDate && formik.errors.startDate}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 160 }}
                />
              )}
            </Field>

            {!formik.values.isAllDay && (
              <Field name="startTime">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    label="Start time"
                    type="time"
                    margin="normal"
                    disabled={isPending || !canEdit}
                    error={!!formik.touched.startTime && !!formik.errors.startTime}
                    helperText={formik.touched.startTime && formik.errors.startTime}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
                    sx={{ minWidth: 130 }}
                  />
                )}
              </Field>
            )}

            <Field name="endDate">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="End date"
                  type="date"
                  margin="normal"
                  disabled={isPending || !canEdit}
                  error={!!formik.touched.endDate && !!formik.errors.endDate}
                  helperText={formik.touched.endDate && formik.errors.endDate}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 160 }}
                />
              )}
            </Field>

            {!formik.values.isAllDay && (
              <Field name="endTime">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    label="End time"
                    type="time"
                    margin="normal"
                    disabled={isPending || !canEdit}
                    error={!!formik.touched.endTime && !!formik.errors.endTime}
                    helperText={formik.touched.endTime && formik.errors.endTime}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
                    sx={{ minWidth: 130 }}
                  />
                )}
              </Field>
            )}
          </Box>

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
