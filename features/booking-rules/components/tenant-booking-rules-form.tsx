"use client";

/**
 * Tenant booking rules settings form — Milestone 6.8.
 *
 * Displays all booking rule fields with clear labels and helper text.
 * Disables dependent notice inputs when the parent action is not allowed.
 */

import { useState, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import { showActionToast } from "@/lib/hooks/use-action-toast";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import type { TenantBookingRulesFormValues } from "../schemas/booking-rules-schema";
import { BOOKING_RULE_DEFAULTS, BOOKING_RULE_BOUNDS } from "../types/booking-rules";
import { fromMinutes, type DurationUnit } from "../utils/duration-unit";
import {
  saveTenantBookingRulesAction,
  type SaveTenantBookingRulesResult,
} from "../actions/save-tenant-booking-rules";
import type { TenantBookingRules } from "../types/booking-rules";

type Props = {
  tenantSlug: string;
  existingRules: TenantBookingRules | null;
  canEdit: boolean;
};

/**
 * Form values used by this component. Notice fields (minimum, cancellation,
 * reschedule) carry a display value plus a unit selector; they are converted
 * back to minutes on submit. All other fields match the schema directly.
 */
type FormValues = Omit<
  TenantBookingRulesFormValues,
  "minimumNoticeMinutes" | "cancellationNoticeMinutes" | "rescheduleNoticeMinutes"
> & {
  minimumNoticeMinutes: number;
  minimumNoticeMinutesUnit: DurationUnit;
  cancellationNoticeMinutes: number;
  cancellationNoticeMinutesUnit: DurationUnit;
  rescheduleNoticeMinutes: number;
  rescheduleNoticeMinutesUnit: DurationUnit;
};

export default function TenantBookingRulesForm({ tenantSlug, existingRules, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<SaveTenantBookingRulesResult | null>(null);

  const minimumNotice = fromMinutes(existingRules?.minimumNoticeMinutes ?? BOOKING_RULE_DEFAULTS.minimumNoticeMinutes);
  const cancellationNotice = fromMinutes(existingRules?.cancellationNoticeMinutes ?? BOOKING_RULE_DEFAULTS.cancellationNoticeMinutes);
  const rescheduleNotice = fromMinutes(existingRules?.rescheduleNoticeMinutes ?? BOOKING_RULE_DEFAULTS.rescheduleNoticeMinutes);

  const initialValues: FormValues = {
    minimumNoticeMinutes: minimumNotice.value,
    minimumNoticeMinutesUnit: minimumNotice.unit,
    maximumAdvanceDays: existingRules?.maximumAdvanceDays ?? BOOKING_RULE_DEFAULTS.maximumAdvanceDays,
    slotIntervalMinutes: existingRules?.slotIntervalMinutes ?? BOOKING_RULE_DEFAULTS.slotIntervalMinutes,
    cancellationNoticeMinutes: cancellationNotice.value,
    cancellationNoticeMinutesUnit: cancellationNotice.unit,
    rescheduleNoticeMinutes: rescheduleNotice.value,
    rescheduleNoticeMinutesUnit: rescheduleNotice.unit,
    allowSameDayBooking: existingRules?.allowSameDayBooking ?? BOOKING_RULE_DEFAULTS.allowSameDayBooking,
    allowCustomerCancellation: existingRules?.allowCustomerCancellation ?? BOOKING_RULE_DEFAULTS.allowCustomerCancellation,
    allowCustomerRescheduling: existingRules?.allowCustomerRescheduling ?? BOOKING_RULE_DEFAULTS.allowCustomerRescheduling,
    requireCustomerPhone: existingRules?.requireCustomerPhone ?? BOOKING_RULE_DEFAULTS.requireCustomerPhone,
    requireCustomerEmail: existingRules?.requireCustomerEmail ?? BOOKING_RULE_DEFAULTS.requireCustomerEmail,
  };

  const handleFormSubmit = (
    values: FormValues,
    { resetForm }: { resetForm: (opts: { values: FormValues }) => void }
  ) => {
    if (!canEdit) return;
    setActionResult(null);

    // The server action also converts, but we send the unit fields explicitly.
    const payload: Record<string, unknown> = {
      ...values,
      minimumNoticeMinutes: values.minimumNoticeMinutes,
      minimumNoticeMinutesUnit: values.minimumNoticeMinutesUnit,
      cancellationNoticeMinutes: values.cancellationNoticeMinutes,
      cancellationNoticeMinutesUnit: values.cancellationNoticeMinutesUnit,
      rescheduleNoticeMinutes: values.rescheduleNoticeMinutes,
      rescheduleNoticeMinutesUnit: values.rescheduleNoticeMinutesUnit,
    };

    startTransition(async () => {
      const result = await saveTenantBookingRulesAction(tenantSlug, payload);
      setActionResult(result);
      showActionToast(result, "Booking rules saved!");
      if (result.success) {
        resetForm({ values });
      }
    });
  };

  return (
    <Formik<FormValues>
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      enableReinitialize={false}
      validateOnBlur
      validateOnChange={false}
    >
      {(formik) => {
        const isDisabled = isPending || !canEdit;
        const isDirty = formik.dirty;

        return (
          <Box component={Form} noValidate>
            {!canEdit && (
              <Alert severity="info" sx={{ mb: 3 }}>
                You have view-only access to booking rules. Contact the business owner to request changes.
              </Alert>
            )}

            {actionResult?.success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {actionResult.message}
              </Alert>
            )}
            {actionResult && !actionResult.success && actionResult.message && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {actionResult.message}
              </Alert>
            )}

            {/* === Scheduling Rules === */}
            <Typography variant="h6" sx={{ mb: 1, mt: 1 }}>
              Scheduling Rules
            </Typography>

            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Field name="minimumNoticeMinutes">
                {({ field }: { field: { name: string; value: number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Minimum Booking Notice"
                    fullWidth
                    margin="normal"
                    error={
                      (!!formik.touched.minimumNoticeMinutes && !!formik.errors.minimumNoticeMinutes) ||
                      !!actionResult?.fieldErrors?.minimumNoticeMinutes
                    }
                    helperText={
                      (formik.touched.minimumNoticeMinutes && formik.errors.minimumNoticeMinutes) ||
                      actionResult?.fieldErrors?.minimumNoticeMinutes ||
                      "How far in advance customers must book."
                    }
                    disabled={isDisabled}
                    slotProps={{ input: { inputProps: { min: 0 } } }}
                  />
                )}
              </Field>
              <Field name="minimumNoticeMinutesUnit">
                {({ field }: { field: { name: string; value: DurationUnit; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    select
                    label="Unit"
                    margin="normal"
                    disabled={isDisabled}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="minutes">Minutes</MenuItem>
                    <MenuItem value="days">Days</MenuItem>
                  </TextField>
                )}
              </Field>
            </Stack>

            <Field name="maximumAdvanceDays">
              {({ field }: { field: { name: string; value: number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Maximum Advance Booking (days)"
                  fullWidth
                  margin="normal"
                  error={
                    (!!formik.touched.maximumAdvanceDays && !!formik.errors.maximumAdvanceDays) ||
                    !!actionResult?.fieldErrors?.maximumAdvanceDays
                  }
                  helperText={
                    (formik.touched.maximumAdvanceDays && formik.errors.maximumAdvanceDays) ||
                    actionResult?.fieldErrors?.maximumAdvanceDays ||
                    `How far ahead customers can book. Range: ${BOOKING_RULE_BOUNDS.maximumAdvanceDays.min}–${BOOKING_RULE_BOUNDS.maximumAdvanceDays.max} days`
                  }
                  disabled={isDisabled}
                  slotProps={{ input: { inputProps: { min: BOOKING_RULE_BOUNDS.maximumAdvanceDays.min, max: BOOKING_RULE_BOUNDS.maximumAdvanceDays.max } } }}
                />
              )}
            </Field>

            <Field name="slotIntervalMinutes">
              {({ field }: { field: { name: string; value: number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Time-Slot Interval (minutes)"
                  fullWidth
                  margin="normal"
                  error={
                    (!!formik.touched.slotIntervalMinutes && !!formik.errors.slotIntervalMinutes) ||
                    !!actionResult?.fieldErrors?.slotIntervalMinutes
                  }
                  helperText={
                    (formik.touched.slotIntervalMinutes && formik.errors.slotIntervalMinutes) ||
                    actionResult?.fieldErrors?.slotIntervalMinutes ||
                    `Time between available start times. Range: ${BOOKING_RULE_BOUNDS.slotIntervalMinutes.min}–${BOOKING_RULE_BOUNDS.slotIntervalMinutes.max} minutes`
                  }
                  disabled={isDisabled}
                  slotProps={{ input: { inputProps: { min: BOOKING_RULE_BOUNDS.slotIntervalMinutes.min, max: BOOKING_RULE_BOUNDS.slotIntervalMinutes.max } } }}
                />
              )}
            </Field>

            <Field name="allowSameDayBooking">
              {({ field }: { field: { name: string; value: boolean; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      disabled={isDisabled}
                    />
                  }
                  label="Allow same-day booking"
                  sx={{ mt: 1, mb: 1, display: "block" }}
                />
              )}
            </Field>

            <Divider sx={{ my: 3 }} />

            {/* === Cancellation Rules === */}
            <Typography variant="h6" sx={{ mb: 1 }}>
              Cancellation Rules
            </Typography>

            <Field name="allowCustomerCancellation">
              {({ field }: { field: { name: string; value: boolean; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      disabled={isDisabled}
                    />
                  }
                  label="Allow customer cancellation"
                  sx={{ mt: 1, mb: 1, display: "block" }}
                />
              )}
            </Field>

            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Field name="cancellationNoticeMinutes">
                {({ field }: { field: { name: string; value: number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Customer Cancellation Notice"
                    fullWidth
                    margin="normal"
                    error={
                      (!!formik.touched.cancellationNoticeMinutes && !!formik.errors.cancellationNoticeMinutes) ||
                      !!actionResult?.fieldErrors?.cancellationNoticeMinutes
                    }
                    helperText={
                      (formik.touched.cancellationNoticeMinutes && formik.errors.cancellationNoticeMinutes) ||
                      actionResult?.fieldErrors?.cancellationNoticeMinutes ||
                      "Minimum notice before appointment start for customer cancellation"
                    }
                    disabled={isDisabled || !formik.values.allowCustomerCancellation}
                    slotProps={{ input: { inputProps: { min: 0 } } }}
                  />
                )}
              </Field>
              <Field name="cancellationNoticeMinutesUnit">
                {({ field }: { field: { name: string; value: DurationUnit; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    select
                    label="Unit"
                    margin="normal"
                    disabled={isDisabled || !formik.values.allowCustomerCancellation}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="minutes">Minutes</MenuItem>
                    <MenuItem value="days">Days</MenuItem>
                  </TextField>
                )}
              </Field>
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* === Rescheduling Rules === */}
            <Typography variant="h6" sx={{ mb: 1 }}>
              Rescheduling Rules
            </Typography>

            <Field name="allowCustomerRescheduling">
              {({ field }: { field: { name: string; value: boolean; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      disabled={isDisabled}
                    />
                  }
                  label="Allow customer rescheduling"
                  sx={{ mt: 1, mb: 1, display: "block" }}
                />
              )}
            </Field>

            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Field name="rescheduleNoticeMinutes">
                {({ field }: { field: { name: string; value: number; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Customer Rescheduling Notice"
                    fullWidth
                    margin="normal"
                    error={
                      (!!formik.touched.rescheduleNoticeMinutes && !!formik.errors.rescheduleNoticeMinutes) ||
                      !!actionResult?.fieldErrors?.rescheduleNoticeMinutes
                    }
                    helperText={
                      (formik.touched.rescheduleNoticeMinutes && formik.errors.rescheduleNoticeMinutes) ||
                      actionResult?.fieldErrors?.rescheduleNoticeMinutes ||
                      "Minimum notice before appointment start for customer rescheduling"
                    }
                    disabled={isDisabled || !formik.values.allowCustomerRescheduling}
                    slotProps={{ input: { inputProps: { min: 0 } } }}
                  />
                )}
              </Field>
              <Field name="rescheduleNoticeMinutesUnit">
                {({ field }: { field: { name: string; value: DurationUnit; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    select
                    label="Unit"
                    margin="normal"
                    disabled={isDisabled || !formik.values.allowCustomerRescheduling}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="minutes">Minutes</MenuItem>
                    <MenuItem value="days">Days</MenuItem>
                  </TextField>
                )}
              </Field>
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* === Customer Requirements === */}
            <Typography variant="h6" sx={{ mb: 1 }}>
              Customer Requirements
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These fields will be required when customer booking is introduced.
            </Typography>

            <Field name="requireCustomerEmail">
              {({ field }: { field: { name: string; value: boolean; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      disabled={isDisabled}
                    />
                  }
                  label="Require customer email"
                  sx={{ display: "block" }}
                />
              )}
            </Field>

            <Field name="requireCustomerPhone">
              {({ field }: { field: { name: string; value: boolean; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      disabled={isDisabled}
                    />
                  }
                  label="Require customer phone"
                  sx={{ display: "block" }}
                />
              )}
            </Field>

            {/* Submit */}
            {canEdit && (
              <Box sx={{ mt: 3, display: "flex", alignItems: "center", gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isPending || !isDirty}
                >
                  {isPending ? "Saving..." : "Save Booking Rules"}
                </Button>
                {isDirty && (
                  <Typography variant="caption" color="warning.main">
                    Unsaved changes
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        );
      }}
    </Formik>
  );
}
