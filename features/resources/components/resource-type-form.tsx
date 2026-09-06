"use client";

import { useState, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import { showActionToast } from "@/lib/hooks/use-action-toast";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
import { resourceTypeSchema, type ResourceTypeFormValues } from "../schemas/resource-type-schema";
import { RESOURCE_KINDS, RESOURCE_KIND_LABELS } from "../types/resource";
import { generateTenantSlug } from "@/lib/tenants/generate-tenant-slug";

type ResourceTypeFormProps = {
  initialValues: ResourceTypeFormValues;
  onSubmit: (values: ResourceTypeFormValues) => Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }>;
  submitLabel: string;
  canEdit: boolean;
};

/** Small inline badge showing whether a field is customer-visible or internal. */
function VisibilityBadge({ visible }: { visible: boolean }) {
  return visible ? (
    <Chip icon={<VisibilityIcon sx={{ fontSize: 14 }} />} label="Customer-visible" size="small" color="info" variant="outlined" sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }} />
  ) : (
    <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="Internal only" size="small" variant="outlined" sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }} />
  );
}

const RESOURCE_KIND_DESCRIPTIONS: Record<string, string> = {
  person: "A staff member, therapist, barber, or any individual who delivers a service. Customers may see their name and select them when booking.",
  room: "A physical space like a treatment room, meeting room, or studio. Used to manage room availability and prevent double-bookings.",
  equipment: "A shared asset like a laser machine, projector, or workstation that services depend on. You can also rent out equipment and hardware to customers.",
  vehicle: "A car, van, or mobile unit used for on-site or mobile services.",
  other: "Anything else that needs its own schedule and availability tracking.",
};

type ResourceKindCopy = {
  nameHelp: string;
  namePlaceholder: string;
  labelsHelp: string;
  singularPlaceholder: string;
  pluralPlaceholder: string;
  descriptionHelp: string;
  descriptionPlaceholder: string;
};

/** Field copy (helper text, placeholders, examples) tailored to each resource kind. */
const RESOURCE_KIND_COPY = {
  person: {
    nameHelp: "The category name shown to customers on the booking page (e.g. \u201CBarbers\u201D, \u201CMassage Therapists\u201D).",
    namePlaceholder: "e.g. Barbers",
    labelsHelp: "These labels appear on the public booking page and in the dashboard. For example, customers might see \u201CChoose a Barber\u201D (singular) or \u201CAvailable Barbers\u201D (plural).",
    singularPlaceholder: "e.g. Barber",
    pluralPlaceholder: "e.g. Barbers",
    descriptionHelp: "Internal notes for your team. Not shown to customers. Use this to document which staff belong to this type and what they do.",
    descriptionPlaceholder: "e.g. Senior barbers who handle all haircut styles",
  },
  room: {
    nameHelp: "The category name shown to customers on the booking page (e.g. \u201CTreatment Rooms\u201D, \u201CStudios\u201D).",
    namePlaceholder: "e.g. Treatment Rooms",
    labelsHelp: "These labels appear on the public booking page and in the dashboard. For example, customers might see \u201CChoose a Room\u201D (singular) or \u201CAvailable Rooms\u201D (plural).",
    singularPlaceholder: "e.g. Room",
    pluralPlaceholder: "e.g. Rooms",
    descriptionHelp: "Internal notes for your team. Not shown to customers. Use this to document what these rooms are used for and any capacity notes.",
    descriptionPlaceholder: "e.g. Private treatment rooms with adjustable lighting",
  },
  equipment: {
    nameHelp: "The category name shown to customers when they book or rent (e.g. \u201CLaser Machines\u201D, \u201CRental Gear\u201D).",
    namePlaceholder: "e.g. Rental Equipment",
    labelsHelp: "These labels appear on the public booking page and in the dashboard. For example, customers might see \u201CChoose Equipment\u201D (singular) or \u201CAvailable Equipment\u201D (plural).",
    singularPlaceholder: "e.g. Machine",
    pluralPlaceholder: "e.g. Machines",
    descriptionHelp: "Internal notes for your team. Not shown to customers. Use this to document the equipment or hardware, rental terms, and maintenance notes.",
    descriptionPlaceholder: "e.g. Laser machines available for treatments and short-term hardware rental",
  },
  vehicle: {
    nameHelp: "The category name shown to customers on the booking page (e.g. \u201CVans\u201D, \u201CMobile Units\u201D).",
    namePlaceholder: "e.g. Mobile Units",
    labelsHelp: "These labels appear on the public booking page and in the dashboard. For example, customers might see \u201CChoose a Vehicle\u201D (singular) or \u201CAvailable Vehicles\u201D (plural).",
    singularPlaceholder: "e.g. Van",
    pluralPlaceholder: "e.g. Vans",
    descriptionHelp: "Internal notes for your team. Not shown to customers. Use this to document each vehicle, its coverage area, and any capacity notes.",
    descriptionPlaceholder: "e.g. Mobile vans used for on-site services within the city",
  },
  other: {
    nameHelp: "The category name shown to customers on the booking page (e.g. \u201CPackages\u201D, \u201CStations\u201D).",
    namePlaceholder: "e.g. Stations",
    labelsHelp: "These labels appear on the public booking page and in the dashboard. Set a singular and plural label that fits this resource.",
    singularPlaceholder: "e.g. Station",
    pluralPlaceholder: "e.g. Stations",
    descriptionHelp: "Internal notes for your team. Not shown to customers. Use this to document what this resource type is for.",
    descriptionPlaceholder: "e.g. Bookable stations with their own schedule",
  },
} satisfies Record<string, ResourceKindCopy>;

export default function ResourceTypeForm({ initialValues, onSubmit, submitLabel, canEdit }: ResourceTypeFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<{ success: boolean; message?: string; fieldErrors?: Record<string, string> } | null>(null);

  const handleSubmit = (values: ResourceTypeFormValues, { resetForm }: { resetForm: (o: { values: ResourceTypeFormValues }) => void }) => {
    if (!canEdit) return;
    setActionResult(null);
    startTransition(async () => { const r = await onSubmit(values); setActionResult(r); showActionToast(r, "Resource type saved!"); if (r.success) resetForm({ values }); });
  };

  return (
    <Formik initialValues={initialValues} validationSchema={resourceTypeSchema} onSubmit={handleSubmit} validateOnBlur validateOnChange={false}>
      {(formik) => {
        const copy = (RESOURCE_KIND_COPY as Record<string, ResourceKindCopy>)[formik.values.resourceKind] ?? RESOURCE_KIND_COPY.other;
        return (
          <Box component={Form} noValidate>
            {actionResult?.success && <Alert severity="success" sx={{ mb: 2 }}>{actionResult.message}</Alert>}
            {actionResult && !actionResult.success && actionResult.message && <Alert severity="error" sx={{ mb: 2 }}>{actionResult.message}</Alert>}

            {/* ── Intro ───────────────────────────────────────── */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "action.hover" }}>
              <Typography variant="subtitle2" gutterBottom>What is a resource type?</Typography>
              <Typography variant="body2" color="text.secondary">
                A resource type is a category that groups similar resources together (e.g. &quot;Barbers&quot;, &quot;Treatment Rooms&quot;).
                Individual resources (people, rooms, etc.) belong to a type. Services are then assigned to resources,
                and customers book time with a specific resource or let the system pick one automatically.
              </Typography>
            </Paper>

            {/* ── Resource Kind ───────────────────────────────── */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2">Resource Kind</Typography>
              <VisibilityBadge visible={false} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Determines how the system treats this resource type. Affects scheduling logic, display icons, and availability rules.
            </Typography>
            <Field name="resourceKind">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  margin="dense"
                  disabled={isPending || !canEdit}
                  error={!!formik.touched.resourceKind && !!formik.errors.resourceKind}
                  helperText={formik.touched.resourceKind && formik.errors.resourceKind}
                >
                  {RESOURCE_KINDS.map((k) => (
                    <MenuItem key={k} value={k}>
                      <Stack>
                        <Typography variant="body2">{RESOURCE_KIND_LABELS[k]}</Typography>
                        <Typography variant="caption" color="text.secondary">{RESOURCE_KIND_DESCRIPTIONS[k]}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Field>
            {formik.values.resourceKind && (
              <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
                {RESOURCE_KIND_DESCRIPTIONS[formik.values.resourceKind]}
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            {/* ── Name ────────────────────────────────────────── */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2">Name</Typography>
              <VisibilityBadge visible />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              {copy.nameHelp}
            </Typography>
            <Field name="name">
              {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    formik.setFieldValue("name", e.target.value);
                    formik.setFieldValue("slug", generateTenantSlug(e.target.value));
                  }}
                  placeholder={copy.namePlaceholder}
                  fullWidth
                  margin="dense"
                  disabled={isPending || !canEdit}
                  error={(!!formik.touched.name && !!formik.errors.name) || !!actionResult?.fieldErrors?.name}
                  helperText={(formik.touched.name && formik.errors.name) || actionResult?.fieldErrors?.name}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                />
              )}
            </Field>

            {/* ── Slug (auto-generated, read-only) ──────────── */}
            <Field name="slug">
              {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  fullWidth
                  margin="dense"
                  disabled
                  helperText="Auto-generated from the name"
                  slotProps={{ htmlInput: { maxLength: 63 } }}
                  sx={{ mt: 1 }}
                />
              )}
            </Field>

            <Divider sx={{ my: 3 }} />

            {/* ── Display Labels ──────────────────────────────── */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2">Display Labels</Typography>
              <VisibilityBadge visible />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              {copy.labelsHelp}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Field name="displayNameSingular">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    label="Singular"
                    placeholder={copy.singularPlaceholder}
                    fullWidth
                    margin="dense"
                    disabled={isPending || !canEdit}
                    error={!!formik.touched.displayNameSingular && !!formik.errors.displayNameSingular}
                    helperText={(formik.touched.displayNameSingular && formik.errors.displayNameSingular) || "Shown when referring to one resource"}
                  />
                )}
              </Field>
              <Field name="displayNamePlural">
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    label="Plural"
                    placeholder={copy.pluralPlaceholder}
                    fullWidth
                    margin="dense"
                    disabled={isPending || !canEdit}
                    error={!!formik.touched.displayNamePlural && !!formik.errors.displayNamePlural}
                    helperText={(formik.touched.displayNamePlural && formik.errors.displayNamePlural) || "Shown when listing multiple resources"}
                  />
                )}
              </Field>
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* ── Description ─────────────────────────────────── */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2">Description</Typography>
              <VisibilityBadge visible={false} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              {copy.descriptionHelp}
            </Typography>
            <Field name="description">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  placeholder={copy.descriptionPlaceholder}
                  multiline
                  minRows={2}
                  fullWidth
                  margin="dense"
                  disabled={isPending || !canEdit}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                />
              )}
            </Field>

            {/* ── Active toggle ───────────────────────────────── */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
              <FormControlLabel
                control={<Switch checked={formik.values.isActive} onChange={(e) => formik.setFieldValue("isActive", e.target.checked)} disabled={isPending || !canEdit} />}
                label="Active"
              />
              <Typography variant="caption" color="text.secondary">
                Inactive types and their resources won&apos;t appear in booking or scheduling.
              </Typography>
            </Stack>

            {/* ── Submit ──────────────────────────────────────── */}
            {canEdit && (
              <Box sx={{ mt: 3 }}>
                <Button type="submit" variant="contained" size="large" disabled={isPending || !formik.dirty}>
                  {isPending ? "Saving..." : submitLabel}
                </Button>
              </Box>
            )}
          </Box>
        );
      }}
    </Formik>
  );
}
