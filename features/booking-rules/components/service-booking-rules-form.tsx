"use client";

/**
 * Service booking rules override form — Milestone 6.8.
 *
 * For each overridable field, supports three states:
 * - "inherit" — use tenant default (field value sent as null)
 * - Explicit override value
 *
 * Uses tri-state radio groups for booleans and a mode toggle for numeric fields.
 * Displays the resolved tenant default value for context.
 */

import { useState, useTransition } from "react";
import { Formik, Form } from "formik";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import { BOOKING_RULE_BOUNDS } from "../types/booking-rules";
import type { TenantBookingRules, ServiceBookingRules } from "../types/booking-rules";
import { BOOKING_RULE_DEFAULTS } from "../types/booking-rules";
import {
  saveServiceBookingRulesAction,
  type SaveServiceBookingRulesResult,
} from "../actions/save-service-booking-rules";
import {
  resetServiceBookingRulesAction,
  type ResetServiceBookingRulesResult,
} from "../actions/reset-service-booking-rules";

// ─── Internal Form Shape ─────────────────────────────────────────────────────

type OverrideMode = "inherit" | "override";

type FormShape = {
  minimumNoticeMode: OverrideMode;
  minimumNoticeMinutes: number;
  maximumAdvanceMode: OverrideMode;
  maximumAdvanceDays: number;
  slotIntervalMode: OverrideMode;
  slotIntervalMinutes: number;
  cancellationNoticeMode: OverrideMode;
  cancellationNoticeMinutes: number;
  rescheduleNoticeMode: OverrideMode;
  rescheduleNoticeMinutes: number;
  allowSameDayBookingMode: OverrideMode;
  allowSameDayBooking: boolean;
  allowCustomerCancellationMode: OverrideMode;
  allowCustomerCancellation: boolean;
  allowCustomerReschedulingMode: OverrideMode;
  allowCustomerRescheduling: boolean;
  requireCustomerPhoneMode: OverrideMode;
  requireCustomerPhone: boolean;
  requireCustomerEmailMode: OverrideMode;
  requireCustomerEmail: boolean;
};

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  tenantSlug: string;
  serviceId: string;
  tenantRules: TenantBookingRules | null;
  serviceRules: ServiceBookingRules | null;
  canEdit: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ServiceBookingRulesForm({
  tenantSlug,
  serviceId,
  tenantRules,
  serviceRules,
  canEdit,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<
    (SaveServiceBookingRulesResult | ResetServiceBookingRulesResult) | null
  >(null);

  // Tenant default values for display
  const tenantDefaults = {
    minimumNoticeMinutes: tenantRules?.minimumNoticeMinutes ?? BOOKING_RULE_DEFAULTS.minimumNoticeMinutes,
    maximumAdvanceDays: tenantRules?.maximumAdvanceDays ?? BOOKING_RULE_DEFAULTS.maximumAdvanceDays,
    slotIntervalMinutes: tenantRules?.slotIntervalMinutes ?? BOOKING_RULE_DEFAULTS.slotIntervalMinutes,
    cancellationNoticeMinutes: tenantRules?.cancellationNoticeMinutes ?? BOOKING_RULE_DEFAULTS.cancellationNoticeMinutes,
    rescheduleNoticeMinutes: tenantRules?.rescheduleNoticeMinutes ?? BOOKING_RULE_DEFAULTS.rescheduleNoticeMinutes,
    allowSameDayBooking: tenantRules?.allowSameDayBooking ?? BOOKING_RULE_DEFAULTS.allowSameDayBooking,
    allowCustomerCancellation: tenantRules?.allowCustomerCancellation ?? BOOKING_RULE_DEFAULTS.allowCustomerCancellation,
    allowCustomerRescheduling: tenantRules?.allowCustomerRescheduling ?? BOOKING_RULE_DEFAULTS.allowCustomerRescheduling,
    requireCustomerPhone: tenantRules?.requireCustomerPhone ?? BOOKING_RULE_DEFAULTS.requireCustomerPhone,
    requireCustomerEmail: tenantRules?.requireCustomerEmail ?? BOOKING_RULE_DEFAULTS.requireCustomerEmail,
  };

  const initialValues: FormShape = {
    minimumNoticeMode: serviceRules?.minimumNoticeMinutes !== null && serviceRules?.minimumNoticeMinutes !== undefined ? "override" : "inherit",
    minimumNoticeMinutes: serviceRules?.minimumNoticeMinutes ?? tenantDefaults.minimumNoticeMinutes,
    maximumAdvanceMode: serviceRules?.maximumAdvanceDays !== null && serviceRules?.maximumAdvanceDays !== undefined ? "override" : "inherit",
    maximumAdvanceDays: serviceRules?.maximumAdvanceDays ?? tenantDefaults.maximumAdvanceDays,
    slotIntervalMode: serviceRules?.slotIntervalMinutes !== null && serviceRules?.slotIntervalMinutes !== undefined ? "override" : "inherit",
    slotIntervalMinutes: serviceRules?.slotIntervalMinutes ?? tenantDefaults.slotIntervalMinutes,
    cancellationNoticeMode: serviceRules?.cancellationNoticeMinutes !== null && serviceRules?.cancellationNoticeMinutes !== undefined ? "override" : "inherit",
    cancellationNoticeMinutes: serviceRules?.cancellationNoticeMinutes ?? tenantDefaults.cancellationNoticeMinutes,
    rescheduleNoticeMode: serviceRules?.rescheduleNoticeMinutes !== null && serviceRules?.rescheduleNoticeMinutes !== undefined ? "override" : "inherit",
    rescheduleNoticeMinutes: serviceRules?.rescheduleNoticeMinutes ?? tenantDefaults.rescheduleNoticeMinutes,
    allowSameDayBookingMode: serviceRules?.allowSameDayBooking !== null && serviceRules?.allowSameDayBooking !== undefined ? "override" : "inherit",
    allowSameDayBooking: serviceRules?.allowSameDayBooking ?? tenantDefaults.allowSameDayBooking,
    allowCustomerCancellationMode: serviceRules?.allowCustomerCancellation !== null && serviceRules?.allowCustomerCancellation !== undefined ? "override" : "inherit",
    allowCustomerCancellation: serviceRules?.allowCustomerCancellation ?? tenantDefaults.allowCustomerCancellation,
    allowCustomerReschedulingMode: serviceRules?.allowCustomerRescheduling !== null && serviceRules?.allowCustomerRescheduling !== undefined ? "override" : "inherit",
    allowCustomerRescheduling: serviceRules?.allowCustomerRescheduling ?? tenantDefaults.allowCustomerRescheduling,
    requireCustomerPhoneMode: serviceRules?.requireCustomerPhone !== null && serviceRules?.requireCustomerPhone !== undefined ? "override" : "inherit",
    requireCustomerPhone: serviceRules?.requireCustomerPhone ?? tenantDefaults.requireCustomerPhone,
    requireCustomerEmailMode: serviceRules?.requireCustomerEmail !== null && serviceRules?.requireCustomerEmail !== undefined ? "override" : "inherit",
    requireCustomerEmail: serviceRules?.requireCustomerEmail ?? tenantDefaults.requireCustomerEmail,
  };

  function formToPayload(values: FormShape): Record<string, unknown> {
    return {
      minimumNoticeMinutes: values.minimumNoticeMode === "override" ? values.minimumNoticeMinutes : null,
      maximumAdvanceDays: values.maximumAdvanceMode === "override" ? values.maximumAdvanceDays : null,
      slotIntervalMinutes: values.slotIntervalMode === "override" ? values.slotIntervalMinutes : null,
      cancellationNoticeMinutes: values.cancellationNoticeMode === "override" ? values.cancellationNoticeMinutes : null,
      rescheduleNoticeMinutes: values.rescheduleNoticeMode === "override" ? values.rescheduleNoticeMinutes : null,
      allowSameDayBooking: values.allowSameDayBookingMode === "override" ? values.allowSameDayBooking : null,
      allowCustomerCancellation: values.allowCustomerCancellationMode === "override" ? values.allowCustomerCancellation : null,
      allowCustomerRescheduling: values.allowCustomerReschedulingMode === "override" ? values.allowCustomerRescheduling : null,
      requireCustomerPhone: values.requireCustomerPhoneMode === "override" ? values.requireCustomerPhone : null,
      requireCustomerEmail: values.requireCustomerEmailMode === "override" ? values.requireCustomerEmail : null,
    };
  }

  const handleFormSubmit = (
    values: FormShape,
    { resetForm }: { resetForm: (opts: { values: FormShape }) => void }
  ) => {
    if (!canEdit) return;
    setActionResult(null);

    startTransition(async () => {
      const payload = formToPayload(values);
      const result = await saveServiceBookingRulesAction(tenantSlug, serviceId, payload);
      setActionResult(result);
      if (result.success) {
        resetForm({ values });
      }
    });
  };

  const handleReset = () => {
    if (!canEdit) return;
    setActionResult(null);

    startTransition(async () => {
      const result = await resetServiceBookingRulesAction(tenantSlug, serviceId);
      setActionResult(result);
    });
  };

  return (
    <Formik<FormShape>
      initialValues={initialValues}
      onSubmit={handleFormSubmit}
      enableReinitialize
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
              <Alert severity="success" sx={{ mb: 2 }}>
                {actionResult.message}
              </Alert>
            )}
            {actionResult && !actionResult.success && actionResult.message && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {actionResult.message}
              </Alert>
            )}

            {/* === Scheduling === */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Scheduling Rules
            </Typography>

            <NumericOverrideField
              label="Minimum Booking Notice (minutes)"
              modeName="minimumNoticeMode"
              valueName="minimumNoticeMinutes"
              tenantLabel={`${tenantDefaults.minimumNoticeMinutes} minutes`}
              min={BOOKING_RULE_BOUNDS.minimumNoticeMinutes.min}
              max={BOOKING_RULE_BOUNDS.minimumNoticeMinutes.max}
              formik={formik}
              disabled={isDisabled}
            />

            <NumericOverrideField
              label="Maximum Advance Booking (days)"
              modeName="maximumAdvanceMode"
              valueName="maximumAdvanceDays"
              tenantLabel={`${tenantDefaults.maximumAdvanceDays} days`}
              min={BOOKING_RULE_BOUNDS.maximumAdvanceDays.min}
              max={BOOKING_RULE_BOUNDS.maximumAdvanceDays.max}
              formik={formik}
              disabled={isDisabled}
            />

            <NumericOverrideField
              label="Time-Slot Interval (minutes)"
              modeName="slotIntervalMode"
              valueName="slotIntervalMinutes"
              tenantLabel={`${tenantDefaults.slotIntervalMinutes} minutes`}
              min={BOOKING_RULE_BOUNDS.slotIntervalMinutes.min}
              max={BOOKING_RULE_BOUNDS.slotIntervalMinutes.max}
              formik={formik}
              disabled={isDisabled}
            />

            <BooleanOverrideField
              label="Same-day booking"
              modeName="allowSameDayBookingMode"
              valueName="allowSameDayBooking"
              tenantDefault={tenantDefaults.allowSameDayBooking}
              trueLabel="Allow"
              falseLabel="Do not allow"
              formik={formik}
              disabled={isDisabled}
            />

            <Divider sx={{ my: 3 }} />

            {/* === Cancellation === */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Cancellation Rules
            </Typography>

            <BooleanOverrideField
              label="Customer cancellation"
              modeName="allowCustomerCancellationMode"
              valueName="allowCustomerCancellation"
              tenantDefault={tenantDefaults.allowCustomerCancellation}
              trueLabel="Allow"
              falseLabel="Do not allow"
              formik={formik}
              disabled={isDisabled}
            />

            <NumericOverrideField
              label="Customer Cancellation Notice (minutes)"
              modeName="cancellationNoticeMode"
              valueName="cancellationNoticeMinutes"
              tenantLabel={`${tenantDefaults.cancellationNoticeMinutes} minutes`}
              min={BOOKING_RULE_BOUNDS.cancellationNoticeMinutes.min}
              max={BOOKING_RULE_BOUNDS.cancellationNoticeMinutes.max}
              formik={formik}
              disabled={isDisabled}
            />

            <Divider sx={{ my: 3 }} />

            {/* === Rescheduling === */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Rescheduling Rules
            </Typography>

            <BooleanOverrideField
              label="Customer rescheduling"
              modeName="allowCustomerReschedulingMode"
              valueName="allowCustomerRescheduling"
              tenantDefault={tenantDefaults.allowCustomerRescheduling}
              trueLabel="Allow"
              falseLabel="Do not allow"
              formik={formik}
              disabled={isDisabled}
            />

            <NumericOverrideField
              label="Customer Rescheduling Notice (minutes)"
              modeName="rescheduleNoticeMode"
              valueName="rescheduleNoticeMinutes"
              tenantLabel={`${tenantDefaults.rescheduleNoticeMinutes} minutes`}
              min={BOOKING_RULE_BOUNDS.rescheduleNoticeMinutes.min}
              max={BOOKING_RULE_BOUNDS.rescheduleNoticeMinutes.max}
              formik={formik}
              disabled={isDisabled}
            />

            <Divider sx={{ my: 3 }} />

            {/* === Customer Requirements === */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Customer Requirements
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These fields will be required when customer booking is introduced.
            </Typography>

            <BooleanOverrideField
              label="Require customer email"
              modeName="requireCustomerEmailMode"
              valueName="requireCustomerEmail"
              tenantDefault={tenantDefaults.requireCustomerEmail}
              trueLabel="Required"
              falseLabel="Optional"
              formik={formik}
              disabled={isDisabled}
            />

            <BooleanOverrideField
              label="Require customer phone"
              modeName="requireCustomerPhoneMode"
              valueName="requireCustomerPhone"
              tenantDefault={tenantDefaults.requireCustomerPhone}
              trueLabel="Required"
              falseLabel="Optional"
              formik={formik}
              disabled={isDisabled}
            />

            {/* Actions */}
            {canEdit && (
              <Box sx={{ mt: 3, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isPending || !formik.dirty}
                >
                  {isPending ? "Saving..." : "Save Service Overrides"}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  color="warning"
                  onClick={handleReset}
                  disabled={isPending}
                >
                  Reset All to Tenant Defaults
                </Button>
              </Box>
            )}
          </Box>
        );
      }}
    </Formik>
  );
}

// ─── Numeric Override Field ──────────────────────────────────────────────────

type NumericOverrideFieldProps = {
  label: string;
  modeName: keyof FormShape;
  valueName: keyof FormShape;
  tenantLabel: string;
  min: number;
  max: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formik: any;
  disabled: boolean;
};

function NumericOverrideField({
  label,
  modeName,
  valueName,
  tenantLabel,
  min,
  max,
  formik,
  disabled,
}: NumericOverrideFieldProps) {
  const mode = formik.values[modeName] as OverrideMode;

  return (
    <Box sx={{ mb: 3 }}>
      <FormControl component="fieldset" disabled={disabled}>
        <FormLabel component="legend" sx={{ fontWeight: 500, mb: 0.5 }}>
          {label}
        </FormLabel>
        <RadioGroup
          row
          value={mode}
          onChange={(e) => formik.setFieldValue(modeName, e.target.value)}
        >
          <FormControlLabel
            value="inherit"
            control={<Radio size="small" />}
            label={`Use tenant default: ${tenantLabel}`}
          />
          <FormControlLabel
            value="override"
            control={<Radio size="small" />}
            label="Override"
          />
        </RadioGroup>
      </FormControl>

      {mode === "override" && (
        <TextField
          type="number"
          value={formik.values[valueName]}
          onChange={(e) => formik.setFieldValue(valueName, e.target.value === "" ? "" : Number(e.target.value))}
          size="small"
          disabled={disabled}
          slotProps={{ input: { inputProps: { min, max } } }}
          sx={{ mt: 1, width: 200 }}
          helperText={`Range: ${min}–${max}`}
        />
      )}
    </Box>
  );
}

// ─── Boolean Override Field ──────────────────────────────────────────────────

type BooleanOverrideFieldProps = {
  label: string;
  modeName: keyof FormShape;
  valueName: keyof FormShape;
  tenantDefault: boolean;
  trueLabel: string;
  falseLabel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formik: any;
  disabled: boolean;
};

function BooleanOverrideField({
  label,
  modeName,
  valueName,
  tenantDefault,
  trueLabel,
  falseLabel,
  formik,
  disabled,
}: BooleanOverrideFieldProps) {
  const mode = formik.values[modeName] as OverrideMode;
  const tenantLabel = tenantDefault ? trueLabel : falseLabel;

  return (
    <Box sx={{ mb: 3 }}>
      <FormControl component="fieldset" disabled={disabled}>
        <FormLabel component="legend" sx={{ fontWeight: 500, mb: 0.5 }}>
          {label}
        </FormLabel>
        <RadioGroup
          value={mode === "inherit" ? "inherit" : formik.values[valueName] ? "true" : "false"}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "inherit") {
              formik.setFieldValue(modeName, "inherit");
            } else {
              formik.setFieldValue(modeName, "override");
              formik.setFieldValue(valueName, val === "true");
            }
          }}
        >
          <FormControlLabel
            value="inherit"
            control={<Radio size="small" />}
            label={`Use tenant default: ${tenantLabel}`}
          />
          <FormControlLabel
            value="true"
            control={<Radio size="small" />}
            label={trueLabel}
          />
          <FormControlLabel
            value="false"
            control={<Radio size="small" />}
            label={falseLabel}
          />
        </RadioGroup>
      </FormControl>
    </Box>
  );
}
