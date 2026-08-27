"use client";

/**
 * About Editor — Milestone 16.4.
 *
 * Edit about section title, body, and optional image URL.
 */

import { useTransition, useState } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { updateHomepageContent } from "../actions/homepage-actions";
import { HOMEPAGE_LIMITS, type AboutFormValues, type HomepageContent } from "../types";

const aboutSchema = Yup.object({
  aboutTitle: Yup.string().max(HOMEPAGE_LIMITS.aboutTitle, `Max ${HOMEPAGE_LIMITS.aboutTitle} characters`),
  aboutBody: Yup.string().max(HOMEPAGE_LIMITS.aboutBody, `Max ${HOMEPAGE_LIMITS.aboutBody} characters`),
  aboutImageUrl: Yup.string().url("Must be a valid URL").max(1000),
});

type Props = {
  tenantSlug: string;
  content: HomepageContent;
  onSaved: () => void;
};

export default function AboutEditor({ tenantSlug, content, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

  const initialValues: AboutFormValues = {
    aboutTitle: content.aboutTitle ?? "",
    aboutBody: content.aboutBody ?? "",
    aboutImageUrl: content.aboutImageUrl ?? "",
  };

  const handleSubmit = (values: AboutFormValues) => {
    setResult(null);
    startTransition(async () => {
      const r = await updateHomepageContent(tenantSlug, {
        aboutTitle: values.aboutTitle || null,
        aboutBody: values.aboutBody || null,
        aboutImageUrl: values.aboutImageUrl || null,
      });
      setResult(r);
      if (r.success) onSaved();
    });
  };

  return (
    <Formik initialValues={initialValues} validationSchema={aboutSchema} onSubmit={handleSubmit} enableReinitialize validateOnBlur validateOnChange={false}>
      {(formik) => (
        <Form noValidate>
          {result && !result.success && <Alert severity="error" sx={{ mb: 2 }}>{result.message}</Alert>}
          {result?.success && <Alert severity="success" sx={{ mb: 2 }}>About section saved.</Alert>}

          <Stack spacing={2}>
            <Field name="aboutTitle">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Section Title"
                  placeholder="About Us"
                  fullWidth
                  disabled={isPending}
                  error={!!formik.touched.aboutTitle && !!formik.errors.aboutTitle}
                  helperText={(formik.touched.aboutTitle && formik.errors.aboutTitle) || `${field.value.length}/${HOMEPAGE_LIMITS.aboutTitle}`}
                  slotProps={{ htmlInput: { maxLength: HOMEPAGE_LIMITS.aboutTitle } }}
                />
              )}
            </Field>

            <Field name="aboutBody">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Description"
                  placeholder="Tell customers about your business..."
                  fullWidth
                  multiline
                  rows={5}
                  disabled={isPending}
                  error={!!formik.touched.aboutBody && !!formik.errors.aboutBody}
                  helperText={(formik.touched.aboutBody && formik.errors.aboutBody) || `${field.value.length}/${HOMEPAGE_LIMITS.aboutBody}`}
                  slotProps={{ htmlInput: { maxLength: HOMEPAGE_LIMITS.aboutBody } }}
                />
              )}
            </Field>

            <Field name="aboutImageUrl">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Image URL (optional)"
                  placeholder="https://..."
                  fullWidth
                  disabled={isPending}
                  error={!!formik.touched.aboutImageUrl && !!formik.errors.aboutImageUrl}
                  helperText={formik.touched.aboutImageUrl && formik.errors.aboutImageUrl}
                />
              )}
            </Field>

            <Button type="submit" variant="contained" disabled={isPending || !formik.dirty} sx={{ alignSelf: "flex-start" }}>
              {isPending ? "Saving..." : "Save About"}
            </Button>

            {formik.dirty && !isPending && (
              <Alert severity="warning" variant="outlined" sx={{ py: 0.5 }}>
                You have unsaved changes.
              </Alert>
            )}
          </Stack>
        </Form>
      )}
    </Formik>
  );
}
