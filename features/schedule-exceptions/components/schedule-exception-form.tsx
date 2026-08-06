"use client";

import { useState, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Chip from "@mui/material/Chip";
import {
  locationScheduleExceptionSchema,
  type ScheduleExceptionFormValues,
} from "../schemas/location-schedule-exception-schema";
import { EXCEPTION_NAME_SUGGESTIONS } from "../types/schedule-exception";

type ScheduleExceptionFormProps = {
  initialValues: ScheduleExceptionFormValues;
  onSubmit: (values: ScheduleExceptionFormValues) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  canEdit: boolean;
  isPastDate?: boolean;
};

export default function ScheduleExceptionForm({
  initialValues,
  onSubmit,
  submitLabel,
  canEdit,
  isPastDate = false,
}: ScheduleExceptionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message?: string;
    fieldErrors?: Record<string, string>;
  } | null>(null);

  const isDisabledByPast = isPastDate && canEdit;
  const formDisabled = !canEdit || isPastDate;

  const handleFormSubmit = (
    values: ScheduleExceptionFormValues,
    { resetForm }: { resetForm: (opts: { values: ScheduleExceptionFormValues }) => void }
  ) => {
    if (formDisabled) return;
    setActionResult(null);
    startTransition(async () => {
      const result = await onSubmit(values);
      setActionResult(result);
      if (result.success) {
        resetForm({ values });
      }
    });
  };

  return (
    <Formik<ScheduleExceptionFormValues>
      initialValues={initialValues}
      validationSchema={locationScheduleExceptionSchema}
      onSubmit={handleFormSubmit}
      validateOnBlur
      validateOnChange={false}
    >
      {(formik) => (
        <Box component={Form} noValidate>
          {!canEdit && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You have view-only access to schedule exceptions.
            </Alert>
          )}
          {isDisabledByPast && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              This exception is in the past and cannot be edited.
            </Alert>
          )}

          {actionResult?.success && (
            <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>
          )}
          {actionResult && !actionResult.success && actionResult.message && (
            <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>
          )}

          {/* Name with suggestions */}
          <Field name="name">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <Box>
                <TextField
                  {...field}
                  label="Exception Name"
                  placeholder="e.g. Public holiday"
                  fullWidth
                  margin="normal"
                  error={(!!formik.touched.name && !!formik.errors.name) || !!actionResult?.fieldErrors?.name}
                  helperText={(formik.touched.name && formik.errors.name) || actionResult?.fieldErrors?.name}
                  disabled={isPending || formDisabled}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                />
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 1 }}>
                  {EXCEPTION_NAME_SUGGESTIONS.map((suggestion) => (
                    <Chip
                      key={suggestion}
                      label={suggestion}
                      size="small"
                      variant={field.value === suggestion ? "filled" : "outlined"}
                      onClick={() => { if (!formDisabled) formik.setFieldValue("name", suggestion); }}
                      disabled={isPending || formDisabled}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Field>

          {/* Date */}
          <Field name="exceptionDate">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                type="date"
                label="Date"
                fullWidth
                margin="normal"
                error={(!!formik.touched.exceptionDate && !!formik.errors.exceptionDate) || !!actionResult?.fieldErrors?.exceptionDate}
                helperText={(formik.touched.exceptionDate && formik.errors.exceptionDate) || actionResult?.fieldErrors?.exceptionDate}
                disabled={isPending || formDisabled}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
          </Field>

          {/* Closed toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={formik.values.isClosed}
                onChange={(e) => {
                  formik.setFieldValue("isClosed", e.target.checked);
                  if (e.target.checked) {
                    formik.setFieldValue("opensAt", null);
                    formik.setFieldValue("closesAt", null);
                  }
                }}
                disabled={isPending || formDisabled}
              />
            }
            label="Closed all day"
            sx={{ my: 1 }}
          />

          {/* Time inputs when open */}
          {!formik.values.isClosed && (
            <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
              <Field name="opensAt">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    type="time"
                    label="Opens"
                    size="small"
                    error={!!formik.touched.opensAt && !!formik.errors.opensAt}
                    helperText={formik.touched.opensAt && formik.errors.opensAt}
                    disabled={isPending || formDisabled}
                    slotProps={{ htmlInput: { step: 900 } }}
                    sx={{ width: 160 }}
                  />
                )}
              </Field>
              <Typography variant="body2" sx={{ alignSelf: "center" }}>to</Typography>
              <Field name="closesAt">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    type="time"
                    label="Closes"
                    size="small"
                    error={!!formik.touched.closesAt && !!formik.errors.closesAt}
                    helperText={formik.touched.closesAt && formik.errors.closesAt}
                    disabled={isPending || formDisabled}
                    slotProps={{ htmlInput: { step: 900 } }}
                    sx={{ width: 160 }}
                  />
                )}
              </Field>
            </Box>
          )}

          {/* Effective schedule preview */}
          <Box sx={{ mt: 2, p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Effective schedule for this date:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formik.values.isClosed
                ? "Closed all day"
                : formik.values.opensAt && formik.values.closesAt
                  ? `Open ${formik.values.opensAt}–${formik.values.closesAt}`
                  : "Special hours (set times above)"}
            </Typography>
          </Box>

          {/* Notes */}
          <Field name="notes">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                label="Notes (optional)"
                multiline
                minRows={2}
                maxRows={4}
                fullWidth
                margin="normal"
                error={!!formik.touched.notes && !!formik.errors.notes}
                helperText={formik.touched.notes && formik.errors.notes}
                disabled={isPending || formDisabled}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
            )}
          </Field>

          {canEdit && !isPastDate && (
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
      )}
    </Formik>
  );
}
