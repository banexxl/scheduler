"use client";

/**
 * Booking Lookup Form — Milestone 18.0.
 *
 * Formik + Yup form for finding a booking by reference + email.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { findBookingByReference } from "../actions/booking-management-actions";
import type { LookupFormValues } from "../types";

const lookupSchema = Yup.object({
  reference: Yup.string()
    .required("Booking reference is required")
    .matches(/^APT-\d{4}-\d{6}$/i, "Format: APT-YYYY-NNNNNN"),
  email: Yup.string()
    .required("Email is required")
    .email("Enter a valid email"),
});

type Props = {
  tenantSlug: string;
};

export default function BookingLookupForm({ tenantSlug }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initialValues: LookupFormValues = { reference: "", email: "" };

  const handleSubmit = (values: LookupFormValues) => {
    setError(null);
    startTransition(async () => {
      const result = await findBookingByReference(tenantSlug, values.reference, values.email);
      if (result.success) {
        // Store email in sessionStorage for the details page to verify
        sessionStorage.setItem(`booking-email-${tenantSlug}`, values.email);
        router.push(`/book/${tenantSlug}/manage/${result.reference}`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Box sx={{ maxWidth: 440, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, textAlign: "center" }}>
        Find Your Booking
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
        Enter your booking reference and email to view your appointment.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Formik initialValues={initialValues} validationSchema={lookupSchema} onSubmit={handleSubmit} validateOnBlur validateOnChange={false}>
        {(formik) => (
          <Form noValidate>
            <Stack spacing={2.5}>
              <Field name="reference">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    label="Booking Reference"
                    placeholder="APT-2026-000001"
                    fullWidth
                    disabled={isPending}
                    autoComplete="off"
                    error={!!formik.touched.reference && !!formik.errors.reference}
                    helperText={formik.touched.reference && formik.errors.reference}
                    slotProps={{ htmlInput: { maxLength: 16, style: { textTransform: "uppercase" } } }}
                  />
                )}
              </Field>

              <Field name="email">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    label="Email"
                    type="email"
                    fullWidth
                    disabled={isPending}
                    autoComplete="email"
                    error={!!formik.touched.email && !!formik.errors.email}
                    helperText={formik.touched.email && formik.errors.email}
                    slotProps={{ htmlInput: { inputMode: "email" } }}
                  />
                )}
              </Field>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isPending}
                sx={{ textTransform: "none", fontWeight: 600, py: 1.25 }}
              >
                {isPending ? "Finding..." : "Find Booking"}
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </Box>
  );
}
