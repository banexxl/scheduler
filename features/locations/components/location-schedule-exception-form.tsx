"use client";

import { useState, useTransition } from "react";
import { Formik, Form, Field, FieldArray } from "formik";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { locationScheduleExceptionSchema } from "../schemas/location-schedule-exception-schema";

type ExceptionFormValues = {
  locationId: string;
  exceptionDate: string;
  exceptionType: string;
  title: string;
  notes: string;
  isActive: boolean;
  periods: Array<{ startTime: string; endTime: string; sortOrder: number }>;
};

type Props = {
  initialValues: ExceptionFormValues;
  onSubmit: (values: Record<string, unknown>) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  canEdit: boolean;
};

export default function LocationScheduleExceptionForm({ initialValues, onSubmit, submitLabel, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);

  const handleSubmit = (values: ExceptionFormValues) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => {
      const r = await onSubmit(values);
      setActionResult(r);
    });
  };

  return (
    <Formik initialValues={initialValues} validationSchema={locationScheduleExceptionSchema} onSubmit={handleSubmit} validateOnBlur validateOnChange={false}>
      {(formik) => (
        <Box component={Form} noValidate>
          {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>You have view-only access.</Alert>}
          {actionResult?.success && <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>}
          {actionResult && !actionResult.success && actionResult.message && <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>}

          <Field name="exceptionDate">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} label="Date" type="date" fullWidth margin="normal" disabled={isPending || !canEdit}
                error={!!formik.touched.exceptionDate && !!formik.errors.exceptionDate}
                helperText={formik.touched.exceptionDate && formik.errors.exceptionDate}
                slotProps={{ inputLabel: { shrink: true } }} />
            )}
          </Field>

          <Field name="exceptionType">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} select label="Exception Type" fullWidth margin="normal" disabled={isPending || !canEdit}
                helperText={formik.values.exceptionType === "closed" ? "Location is closed for the entire day" : "Custom opening hours replace the normal schedule"}>
                <MenuItem value="closed">Closed</MenuItem>
                <MenuItem value="custom_hours">Custom Hours</MenuItem>
              </TextField>
            )}
          </Field>

          <Field name="title">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} label="Title (optional)" placeholder="e.g. Christmas Day, Early close" fullWidth margin="normal"
                disabled={isPending || !canEdit} slotProps={{ htmlInput: { maxLength: 120 } }} />
            )}
          </Field>

          <Field name="notes">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField {...field} label="Notes (optional)" multiline minRows={2} maxRows={4} fullWidth margin="normal"
                disabled={isPending || !canEdit} slotProps={{ htmlInput: { maxLength: 2000 } }} />
            )}
          </Field>

          {formik.values.exceptionType === "custom_hours" && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Custom Opening Periods</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                These periods replace the normal business hours for this date.
              </Typography>

              <FieldArray name="periods">
                {({ push, remove }) => (
                  <Box>
                    {formik.values.periods.map((period, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 1, mb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                        <TextField label="Start" type="time" size="small" sx={{ width: 120 }}
                          value={period.startTime}
                          onChange={(e) => formik.setFieldValue(`periods.${idx}.startTime`, e.target.value)}
                          disabled={isPending || !canEdit}
                          slotProps={{ htmlInput: { step: 300 } }} />
                        <Typography variant="body2">&mdash;</Typography>
                        <TextField label="End" type="time" size="small" sx={{ width: 120 }}
                          value={period.endTime}
                          onChange={(e) => formik.setFieldValue(`periods.${idx}.endTime`, e.target.value)}
                          disabled={isPending || !canEdit}
                          slotProps={{ htmlInput: { step: 300 } }} />
                        {canEdit && (
                          <IconButton size="small" onClick={() => remove(idx)} disabled={isPending} aria-label="Remove period">
                            &#10005;
                          </IconButton>
                        )}
                      </Paper>
                    ))}
                    {canEdit && (
                      <Button size="small" onClick={() => push({ startTime: "09:00", endTime: "17:00", sortOrder: formik.values.periods.length })} disabled={isPending} sx={{ mt: 0.5 }}>
                        + Add period
                      </Button>
                    )}
                  </Box>
                )}
              </FieldArray>
            </Box>
          )}

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
