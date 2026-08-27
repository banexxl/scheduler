"use client";

/**
 * Hero Editor — Milestone 16.4.
 *
 * Edit hero headline, subheadline, CTA label, and CTA destination.
 * Uses Formik + Yup for validation with unsaved changes warning.
 */

import { useTransition, useState } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { updateHomepageContent } from "../actions/homepage-actions";
import {
  HOMEPAGE_LIMITS,
  CTA_TARGETS,
  CTA_TARGET_LABELS,
  type HeroFormValues,
  type HomepageContent,
} from "../types";

const heroSchema = Yup.object({
  heroTitle: Yup.string().max(HOMEPAGE_LIMITS.heroTitle, `Max ${HOMEPAGE_LIMITS.heroTitle} characters`),
  heroSubtitle: Yup.string().max(HOMEPAGE_LIMITS.heroSubtitle, `Max ${HOMEPAGE_LIMITS.heroSubtitle} characters`),
  heroCtaLabel: Yup.string().required("CTA label is required").max(HOMEPAGE_LIMITS.heroCtaLabel, `Max ${HOMEPAGE_LIMITS.heroCtaLabel} characters`),
  heroCtaTarget: Yup.string().oneOf([...CTA_TARGETS]).required(),
});

type Props = {
  tenantSlug: string;
  content: HomepageContent;
  onSaved: () => void;
};

export default function HeroEditor({ tenantSlug, content, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

  const initialValues: HeroFormValues = {
    heroTitle: content.heroTitle ?? "",
    heroSubtitle: content.heroSubtitle ?? "",
    heroCtaLabel: content.heroCtaLabel,
    heroCtaTarget: content.heroCtaTarget,
  };

  const handleSubmit = (values: HeroFormValues) => {
    setResult(null);
    startTransition(async () => {
      const r = await updateHomepageContent(tenantSlug, {
        heroTitle: values.heroTitle || null,
        heroSubtitle: values.heroSubtitle || null,
        heroCtaLabel: values.heroCtaLabel,
        heroCtaTarget: values.heroCtaTarget,
      });
      setResult(r);
      if (r.success) onSaved();
    });
  };

  return (
    <Formik initialValues={initialValues} validationSchema={heroSchema} onSubmit={handleSubmit} enableReinitialize validateOnBlur validateOnChange={false}>
      {(formik) => (
        <Form noValidate>
          {result && !result.success && <Alert severity="error" sx={{ mb: 2 }}>{result.message}</Alert>}
          {result?.success && <Alert severity="success" sx={{ mb: 2 }}>Hero saved.</Alert>}

          <Stack spacing={2}>
            <Field name="heroTitle">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Headline"
                  placeholder="Welcome to our business"
                  fullWidth
                  disabled={isPending}
                  error={!!formik.touched.heroTitle && !!formik.errors.heroTitle}
                  helperText={(formik.touched.heroTitle && formik.errors.heroTitle) || `${field.value.length}/${HOMEPAGE_LIMITS.heroTitle}`}
                  slotProps={{ htmlInput: { maxLength: HOMEPAGE_LIMITS.heroTitle } }}
                />
              )}
            </Field>

            <Field name="heroSubtitle">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Subheadline"
                  placeholder="A short description of what you do"
                  fullWidth
                  multiline
                  rows={2}
                  disabled={isPending}
                  error={!!formik.touched.heroSubtitle && !!formik.errors.heroSubtitle}
                  helperText={(formik.touched.heroSubtitle && formik.errors.heroSubtitle) || `${field.value.length}/${HOMEPAGE_LIMITS.heroSubtitle}`}
                  slotProps={{ htmlInput: { maxLength: HOMEPAGE_LIMITS.heroSubtitle } }}
                />
              )}
            </Field>

            <Field name="heroCtaLabel">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="CTA Button Label"
                  placeholder="Book Now"
                  fullWidth
                  disabled={isPending}
                  error={!!formik.touched.heroCtaLabel && !!formik.errors.heroCtaLabel}
                  helperText={formik.touched.heroCtaLabel && formik.errors.heroCtaLabel}
                  slotProps={{ htmlInput: { maxLength: HOMEPAGE_LIMITS.heroCtaLabel } }}
                />
              )}
            </Field>

            <Field name="heroCtaTarget">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="CTA Destination" select fullWidth disabled={isPending}>
                  {CTA_TARGETS.map((t) => (
                    <MenuItem key={t} value={t}>{CTA_TARGET_LABELS[t]}</MenuItem>
                  ))}
                </TextField>
              )}
            </Field>

            <Button type="submit" variant="contained" disabled={isPending || !formik.dirty} sx={{ alignSelf: "flex-start" }}>
              {isPending ? "Saving..." : "Save Hero"}
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
