"use client";

import { useState, useCallback, useTransition } from "react";
import { Formik, Form } from "formik";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { locationWorkingHoursSchema } from "../schemas/location-working-hours-schema";
import type { WorkingHoursDay as WorkingHoursDayType } from "../types/working-hours";
import { ORDERED_DAYS } from "../types/working-hours";
import {
  updateLocationWorkingHoursAction,
  type WorkingHoursActionResult,
} from "../actions/update-location-working-hours";
import WorkingHoursDay from "./working-hours-day";
import WorkingHoursToolbar from "./working-hours-toolbar";

type WorkingHoursFormProps = {
  initialDays: WorkingHoursDayType[];
  tenantSlug: string;
  locationId: string;
  canEdit: boolean;
};

type FormValues = { days: WorkingHoursDayType[] };

/**
 * Weekly working hours form with Formik.
 * Displays 7 day cards (Mon–Sun) with convenience bulk actions.
 */
export default function WorkingHoursForm({
  initialDays,
  tenantSlug,
  locationId,
  canEdit,
}: WorkingHoursFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<WorkingHoursActionResult | null>(null);

  const handleSubmit = useCallback(
    (values: FormValues, { resetForm }: { resetForm: (opts: { values: FormValues }) => void }) => {
      if (!canEdit) return;
      setActionResult(null);
      startTransition(async () => {
        const result = await updateLocationWorkingHoursAction(tenantSlug, locationId, values);
        setActionResult(result);
        if (result.success) {
          resetForm({ values });
        }
      });
    },
    [canEdit, tenantSlug, locationId]
  );

  return (
    <Formik<FormValues>
      initialValues={{ days: initialDays }}
      validationSchema={locationWorkingHoursSchema}
      onSubmit={handleSubmit}
      validateOnBlur={false}
      validateOnChange={false}
    >
      {(formik) => {
        const isDisabled = isPending || !canEdit;

        // Get Monday's data for convenience actions (index 0 in our ordered array)
        const mondayData = formik.values.days[0];

        const applyMondayToAll = () => {
          if (!mondayData) return;
          const newDays = ORDERED_DAYS.map((day) => ({
            dayOfWeek: day,
            isClosed: mondayData.isClosed,
            opensAt: mondayData.opensAt,
            closesAt: mondayData.closesAt,
          }));
          formik.setFieldValue("days", newDays);
        };

        const applyWeekdays = () => {
          if (!mondayData) return;
          const newDays = formik.values.days.map((d) => {
            // Weekdays: Mon(1)–Fri(5)
            if (d.dayOfWeek >= 1 && d.dayOfWeek <= 5) {
              return { ...d, isClosed: mondayData.isClosed, opensAt: mondayData.opensAt, closesAt: mondayData.closesAt };
            }
            return d;
          });
          formik.setFieldValue("days", newDays);
        };

        const applyWeekends = () => {
          // Find Saturday (index 5 in ORDERED_DAYS which is day 6)
          const satData = formik.values.days.find((d) => d.dayOfWeek === 6);
          if (!satData) return;
          const newDays = formik.values.days.map((d) => {
            // Weekends: Sat(6), Sun(0)
            if (d.dayOfWeek === 6 || d.dayOfWeek === 0) {
              return { ...d, isClosed: satData.isClosed, opensAt: satData.opensAt, closesAt: satData.closesAt };
            }
            return d;
          });
          formik.setFieldValue("days", newDays);
        };

        return (
          <Box component={Form} noValidate>
            {!canEdit && (
              <Alert severity="info" sx={{ mb: 2 }}>
                You have view-only access to working hours.
              </Alert>
            )}

            {actionResult?.success && (
              <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>
            )}
            {actionResult && !actionResult.success && actionResult.message && (
              <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>
            )}

            {canEdit && (
              <WorkingHoursToolbar
                onApplyMondayToAll={applyMondayToAll}
                onApplyWeekdays={applyWeekdays}
                onApplyWeekends={applyWeekends}
                disabled={isDisabled}
              />
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {formik.values.days.map((day, index) => {
                const dayErrors = formik.errors.days;
                const dayError = Array.isArray(dayErrors) ? dayErrors[index] : undefined;
                const errorMsg = typeof dayError === "string" ? dayError : (dayError as { opensAt?: string; closesAt?: string } | undefined)?.opensAt || (dayError as { opensAt?: string; closesAt?: string } | undefined)?.closesAt || undefined;

                return (
                  <WorkingHoursDay
                    key={day.dayOfWeek}
                    dayOfWeek={day.dayOfWeek}
                    isClosed={day.isClosed}
                    opensAt={day.opensAt}
                    closesAt={day.closesAt}
                    onClosedChange={(closed) => {
                      formik.setFieldValue(`days.${index}.isClosed`, closed);
                      if (closed) {
                        formik.setFieldValue(`days.${index}.opensAt`, null);
                        formik.setFieldValue(`days.${index}.closesAt`, null);
                      }
                    }}
                    onOpensAtChange={(val) => formik.setFieldValue(`days.${index}.opensAt`, val)}
                    onClosesAtChange={(val) => formik.setFieldValue(`days.${index}.closesAt`, val)}
                    disabled={isDisabled}
                    error={errorMsg}
                  />
                );
              })}
            </Box>

            {canEdit && (
              <Box sx={{ mt: 3, display: "flex", alignItems: "center", gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isPending || !formik.dirty}
                >
                  {isPending ? "Saving..." : "Save Working Hours"}
                </Button>
                {formik.dirty && (
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
