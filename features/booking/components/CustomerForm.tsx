"use client";

/**
 * Customer Form — Milestone 17.2.
 *
 * Formik + Yup validated customer details form.
 * Collects first name, last name, email, phone, and optional notes.
 */

import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { CustomerInfo } from "../types";

const customerSchema = Yup.object({
  firstName: Yup.string().required("First name is required").max(80),
  lastName: Yup.string().required("Last name is required").max(80),
  email: Yup.string().required("Email is required").email("Enter a valid email"),
  phone: Yup.string().required("Phone is required").min(3, "Phone is too short").max(30),
  notes: Yup.string().max(500, "Notes cannot exceed 500 characters"),
});

type Props = {
  initialValues: CustomerInfo;
  onSubmit: (values: CustomerInfo) => void;
  onBack: () => void;
  submitting?: boolean;
};

export default function CustomerForm({ initialValues, onSubmit, onBack, submitting = false }: Props) {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={customerSchema}
      onSubmit={onSubmit}
      validateOnBlur
      validateOnChange={false}
    >
      {(formik) => (
        <Box component={Form} noValidate>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Your Details
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your contact information to confirm the booking.
          </Typography>

          <Stack spacing={2.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Field name="firstName">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    label="First Name"
                    required
                    fullWidth
                    disabled={submitting}
                    autoComplete="given-name"
                    error={!!formik.touched.firstName && !!formik.errors.firstName}
                    helperText={formik.touched.firstName && formik.errors.firstName}
                    slotProps={{ htmlInput: { maxLength: 80 } }}
                  />
                )}
              </Field>
              <Field name="lastName">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    label="Last Name"
                    required
                    fullWidth
                    disabled={submitting}
                    autoComplete="family-name"
                    error={!!formik.touched.lastName && !!formik.errors.lastName}
                    helperText={formik.touched.lastName && formik.errors.lastName}
                    slotProps={{ htmlInput: { maxLength: 80 } }}
                  />
                )}
              </Field>
            </Stack>

            <Field name="email">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  required
                  fullWidth
                  disabled={submitting}
                  autoComplete="email"
                  error={!!formik.touched.email && !!formik.errors.email}
                  helperText={formik.touched.email && formik.errors.email}
                  slotProps={{ htmlInput: { inputMode: "email" } }}
                />
              )}
            </Field>

            <Field name="phone">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Phone"
                  type="tel"
                  required
                  fullWidth
                  disabled={submitting}
                  autoComplete="tel"
                  error={!!formik.touched.phone && !!formik.errors.phone}
                  helperText={formik.touched.phone && formik.errors.phone}
                  slotProps={{ htmlInput: { inputMode: "tel", maxLength: 30 } }}
                />
              )}
            </Field>

            <Field name="notes">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Notes (optional)"
                  fullWidth
                  multiline
                  rows={3}
                  disabled={submitting}
                  error={!!formik.touched.notes && !!formik.errors.notes}
                  helperText={(formik.touched.notes && formik.errors.notes) || `${field.value.length}/500`}
                  slotProps={{ htmlInput: { maxLength: 500 } }}
                />
              )}
            </Field>
          </Stack>

          <Alert severity="info" variant="outlined" icon={false} sx={{ mt: 2.5 }}>
            <Typography variant="caption" color="text.secondary">
              Your contact details are used to manage this booking and send appointment updates.
            </Typography>
          </Alert>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
            <Button onClick={onBack} variant="outlined" disabled={submitting} sx={{ textTransform: "none" }}>
              Back
            </Button>
            <Button type="submit" variant="contained" disabled={submitting || !formik.isValid} sx={{ textTransform: "none", fontWeight: 600 }}>
              {submitting ? "Submitting..." : "Review Booking"}
            </Button>
          </Box>
        </Box>
      )}
    </Formik>
  );
}
