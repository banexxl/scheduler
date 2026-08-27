"use client";

/**
 * Testimonial Editor — Milestone 16.4.
 *
 * CRUD for manually curated testimonials with reorder support.
 */

import { useState, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Rating from "@mui/material/Rating";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "../actions/homepage-actions";
import { HOMEPAGE_LIMITS, type Testimonial, type TestimonialFormValues } from "../types";

const testimonialSchema = Yup.object({
  authorName: Yup.string().required("Name is required").max(HOMEPAGE_LIMITS.testimonialAuthor),
  rating: Yup.number().min(1).max(5).required(),
  body: Yup.string().required("Review text is required").max(HOMEPAGE_LIMITS.testimonialBody),
  avatarUrl: Yup.string().url("Must be a valid URL"),
});

type Props = {
  tenantSlug: string;
  testimonials: Testimonial[];
  onChanged: () => void;
};

export default function TestimonialEditor({ tenantSlug, testimonials, onChanged }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const handleCreate = (values: TestimonialFormValues) => {
    setError(null);
    startTransition(async () => {
      const r = await createTestimonial(tenantSlug, {
        authorName: values.authorName,
        rating: values.rating,
        body: values.body,
        avatarUrl: values.avatarUrl || undefined,
      });
      if (r.success) {
        setShowAdd(false);
        onChanged();
      } else {
        setError(r.message);
      }
    });
  };

  const handleUpdate = (id: string, values: TestimonialFormValues) => {
    setError(null);
    startTransition(async () => {
      const r = await updateTestimonial(tenantSlug, id, {
        authorName: values.authorName,
        rating: values.rating,
        body: values.body,
        avatarUrl: values.avatarUrl || undefined,
      });
      if (r.success) {
        setEditingId(null);
        onChanged();
      } else {
        setError(r.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    setError(null);
    startTransition(async () => {
      const r = await deleteTestimonial(tenantSlug, id);
      if (r.success) onChanged();
      else setError(r.message);
    });
  };

  const emptyValues: TestimonialFormValues = { authorName: "", rating: 5, body: "", avatarUrl: "" };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {testimonials.length}/{HOMEPAGE_LIMITS.maxTestimonials} testimonials
      </Typography>

      {/* Existing testimonials */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        {testimonials.map((t) => (
          <Paper key={t.id} variant="outlined" sx={{ p: 2 }}>
            {editingId === t.id ? (
              <TestimonialForm
                initialValues={{ authorName: t.authorName, rating: t.rating, body: t.body, avatarUrl: t.avatarUrl ?? "" }}
                onSubmit={(v) => handleUpdate(t.id, v)}
                onCancel={() => setEditingId(null)}
                isPending={isPending}
                submitLabel="Update"
              />
            ) : (
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Rating value={t.rating} readOnly size="small" />
                  <Typography variant="subtitle2">{t.authorName}</Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <IconButton size="small" onClick={() => setEditingId(t.id)} disabled={isPending} aria-label="Edit">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(t.id)} disabled={isPending} color="error" aria-label="Delete">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {t.body}
                </Typography>
              </Box>
            )}
          </Paper>
        ))}
      </Stack>

      {/* Add new */}
      {showAdd ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>New Testimonial</Typography>
          <TestimonialForm
            initialValues={emptyValues}
            onSubmit={handleCreate}
            onCancel={() => setShowAdd(false)}
            isPending={isPending}
            submitLabel="Add"
          />
        </Paper>
      ) : (
        <Button variant="outlined" size="small" onClick={() => setShowAdd(true)} disabled={isPending || testimonials.length >= HOMEPAGE_LIMITS.maxTestimonials}>
          Add Testimonial
        </Button>
      )}
    </Box>
  );
}

// ─── Shared Form ─────────────────────────────────────────────────────────────

function TestimonialForm({
  initialValues,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  initialValues: TestimonialFormValues;
  onSubmit: (v: TestimonialFormValues) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <Formik initialValues={initialValues} validationSchema={testimonialSchema} onSubmit={onSubmit} validateOnBlur validateOnChange={false}>
      {(formik) => (
        <Form noValidate>
          <Stack spacing={2}>
            <Field name="authorName">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Name" fullWidth size="small" disabled={isPending}
                  error={!!formik.touched.authorName && !!formik.errors.authorName}
                  helperText={formik.touched.authorName && formik.errors.authorName}
                  slotProps={{ htmlInput: { maxLength: HOMEPAGE_LIMITS.testimonialAuthor } }}
                />
              )}
            </Field>

            <Box>
              <Typography variant="caption" color="text.secondary">Rating</Typography>
              <Rating
                value={formik.values.rating}
                onChange={(_, val) => formik.setFieldValue("rating", val ?? 5)}
                disabled={isPending}
              />
            </Box>

            <Field name="body">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Review Text" fullWidth multiline rows={3} size="small" disabled={isPending}
                  error={!!formik.touched.body && !!formik.errors.body}
                  helperText={formik.touched.body && formik.errors.body}
                  slotProps={{ htmlInput: { maxLength: HOMEPAGE_LIMITS.testimonialBody } }}
                />
              )}
            </Field>

            <Field name="avatarUrl">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField {...field} label="Avatar URL (optional)" fullWidth size="small" disabled={isPending}
                  error={!!formik.touched.avatarUrl && !!formik.errors.avatarUrl}
                  helperText={formik.touched.avatarUrl && formik.errors.avatarUrl}
                />
              )}
            </Field>

            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" size="small" disabled={isPending}>{isPending ? "Saving..." : submitLabel}</Button>
              <Button variant="outlined" size="small" onClick={onCancel} disabled={isPending}>Cancel</Button>
            </Stack>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}
