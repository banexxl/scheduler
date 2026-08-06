"use client";

import { useState, useTransition } from "react";
import { Formik, Form, Field } from "formik";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import ListSubheader from "@mui/material/ListSubheader";
import {
  updateBusinessSettingsSchema,
  type UpdateBusinessSettingsFormValues,
  SUPPORTED_LANGUAGES,
  SOCIAL_PLATFORMS,
} from "../schemas/update-business-settings-schema";
import { SUPPORTED_CURRENCIES } from "../utils/supported-currencies";
import { TIMEZONE_LIST } from "../utils/timezone-list";
import {
  updateBusinessSettingsAction,
  type UpdateBusinessSettingsResult,
} from "../actions/update-business-settings";
import type { BusinessSettings } from "../services/get-business-settings";
import BusinessUrlPreview from "./business-url-preview";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  sr: "Serbian",
  ro: "Romanian",
};

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
};

type BusinessSettingsFormProps = {
  settings: BusinessSettings;
  tenantSlug: string;
  canEdit: boolean;
};

/**
 * Business settings form.
 * Editable for owner/admin, read-only for manager/staff.
 */
export default function BusinessSettingsForm({
  settings,
  tenantSlug,
  canEdit,
}: BusinessSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] =
    useState<UpdateBusinessSettingsResult | null>(null);

  const initialValues: UpdateBusinessSettingsFormValues = {
    name: settings.name,
    contactEmail: settings.contactEmail ?? "",
    contactPhone: settings.contactPhone ?? "",
    defaultTimezone: settings.defaultTimezone,
    defaultCurrency: settings.defaultCurrency,
    description: settings.description ?? "",
    websiteUrl: settings.websiteUrl ?? "",
    defaultLanguage: settings.defaultLanguage,
    socialLinks: {
      facebook: settings.socialLinks.facebook ?? "",
      instagram: settings.socialLinks.instagram ?? "",
      linkedin: settings.socialLinks.linkedin ?? "",
      tiktok: settings.socialLinks.tiktok ?? "",
      youtube: settings.socialLinks.youtube ?? "",
    },
  };

  // Group timezones for rendering
  const groupedTimezones: Array<[string, typeof TIMEZONE_LIST]> = [];
  const groupMap = new Map<string, (typeof TIMEZONE_LIST)[number][]>();
  for (const tz of TIMEZONE_LIST) {
    const existing = groupMap.get(tz.group);
    if (existing) {
      existing.push(tz);
    } else {
      const arr = [tz];
      groupMap.set(tz.group, arr);
      groupedTimezones.push([tz.group, arr]);
    }
  }

  const handleFormSubmit = (
    values: UpdateBusinessSettingsFormValues,
    { resetForm }: { resetForm: (opts: { values: UpdateBusinessSettingsFormValues }) => void }
  ) => {
    if (!canEdit) return;
    setActionResult(null);

    startTransition(async () => {
      const result = await updateBusinessSettingsAction(tenantSlug, values);
      setActionResult(result);
      if (result.success) {
        // Reset form with new values so dirty state clears
        resetForm({ values });
      }
    });
  };

  return (
    <Formik<UpdateBusinessSettingsFormValues>
      initialValues={initialValues}
      validationSchema={updateBusinessSettingsSchema}
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
            {/* Read-only notice */}
            {!canEdit && (
              <Alert severity="info" sx={{ mb: 3 }}>
                You have view-only access to business settings. Contact the
                business owner to request changes.
              </Alert>
            )}

            {/* Action result */}
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

            {/* === Basic Information === */}
            <Typography variant="h6" sx={{ mb: 1, mt: 1 }}>
              Basic Information
            </Typography>

            <Field name="name">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Business Name"
                  fullWidth
                  margin="normal"
                  error={
                    (!!formik.touched.name && !!formik.errors.name) ||
                    !!actionResult?.fieldErrors?.name
                  }
                  helperText={
                    (formik.touched.name && formik.errors.name) ||
                    actionResult?.fieldErrors?.name
                  }
                  disabled={isDisabled}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                />
              )}
            </Field>

            {/* Slug — read-only */}
            <TextField
              label="Business Address (slug)"
              value={settings.slug}
              fullWidth
              margin="normal"
              disabled
              helperText="Slug changes are not currently supported."
            />

            {/* URL Preview */}
            <Box sx={{ my: 1 }}>
              <BusinessUrlPreview slug={settings.slug} />
            </Box>

            <Field name="description">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Description"
                  fullWidth
                  margin="normal"
                  multiline
                  minRows={3}
                  maxRows={6}
                  error={
                    (!!formik.touched.description && !!formik.errors.description) ||
                    !!actionResult?.fieldErrors?.description
                  }
                  helperText={
                    (formik.touched.description && formik.errors.description) ||
                    actionResult?.fieldErrors?.description ||
                    `${(field.value ?? "").length} / 2000`
                  }
                  disabled={isDisabled}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                />
              )}
            </Field>

            <Divider sx={{ my: 3 }} />

            {/* === Contact Information === */}
            <Typography variant="h6" sx={{ mb: 1 }}>
              Contact Information
            </Typography>

            <Field name="contactEmail">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Contact Email"
                  type="email"
                  fullWidth
                  margin="normal"
                  error={
                    (!!formik.touched.contactEmail && !!formik.errors.contactEmail) ||
                    !!actionResult?.fieldErrors?.contactEmail
                  }
                  helperText={
                    (formik.touched.contactEmail && formik.errors.contactEmail) ||
                    actionResult?.fieldErrors?.contactEmail
                  }
                  disabled={isDisabled}
                  slotProps={{ htmlInput: { maxLength: 254 } }}
                />
              )}
            </Field>

            <Field name="contactPhone">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Contact Phone"
                  fullWidth
                  margin="normal"
                  error={
                    (!!formik.touched.contactPhone && !!formik.errors.contactPhone) ||
                    !!actionResult?.fieldErrors?.contactPhone
                  }
                  helperText={
                    (formik.touched.contactPhone && formik.errors.contactPhone) ||
                    actionResult?.fieldErrors?.contactPhone
                  }
                  disabled={isDisabled}
                  slotProps={{ htmlInput: { maxLength: 40 } }}
                />
              )}
            </Field>

            <Field name="websiteUrl">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  label="Website URL"
                  placeholder="https://example.com"
                  fullWidth
                  margin="normal"
                  error={
                    (!!formik.touched.websiteUrl && !!formik.errors.websiteUrl) ||
                    !!actionResult?.fieldErrors?.websiteUrl
                  }
                  helperText={
                    (formik.touched.websiteUrl && formik.errors.websiteUrl) ||
                    actionResult?.fieldErrors?.websiteUrl
                  }
                  disabled={isDisabled}
                  slotProps={{ htmlInput: { maxLength: 500 } }}
                />
              )}
            </Field>

            <Divider sx={{ my: 3 }} />

            {/* === Regional Defaults === */}
            <Typography variant="h6" sx={{ mb: 1 }}>
              Regional Defaults
            </Typography>

            <Field name="defaultTimezone">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  select
                  label="Timezone"
                  fullWidth
                  margin="normal"
                  error={
                    (!!formik.touched.defaultTimezone && !!formik.errors.defaultTimezone) ||
                    !!actionResult?.fieldErrors?.defaultTimezone
                  }
                  helperText={
                    (formik.touched.defaultTimezone && formik.errors.defaultTimezone) ||
                    actionResult?.fieldErrors?.defaultTimezone
                  }
                  disabled={isDisabled}
                >
                  {groupedTimezones.map(([group, tzList]) => [
                    <ListSubheader key={`group-${group}`}>{group}</ListSubheader>,
                    ...tzList.map((tz) => (
                      <MenuItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </MenuItem>
                    )),
                  ])}
                </TextField>
              )}
            </Field>

            <Field name="defaultCurrency">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  select
                  label="Currency"
                  fullWidth
                  margin="normal"
                  error={
                    (!!formik.touched.defaultCurrency && !!formik.errors.defaultCurrency) ||
                    !!actionResult?.fieldErrors?.defaultCurrency
                  }
                  helperText={
                    (formik.touched.defaultCurrency && formik.errors.defaultCurrency) ||
                    actionResult?.fieldErrors?.defaultCurrency
                  }
                  disabled={isDisabled}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <MenuItem key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Field>

            <Field name="defaultLanguage">
              {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                <TextField
                  {...field}
                  select
                  label="Default Language"
                  fullWidth
                  margin="normal"
                  error={
                    (!!formik.touched.defaultLanguage && !!formik.errors.defaultLanguage) ||
                    !!actionResult?.fieldErrors?.defaultLanguage
                  }
                  helperText={
                    (formik.touched.defaultLanguage && formik.errors.defaultLanguage) ||
                    actionResult?.fieldErrors?.defaultLanguage
                  }
                  disabled={isDisabled}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <MenuItem key={lang} value={lang}>
                      {LANGUAGE_LABELS[lang] ?? lang}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Field>

            <Divider sx={{ my: 3 }} />

            {/* === Social Links === */}
            <Typography variant="h6" sx={{ mb: 1 }}>
              Social Links
            </Typography>

            {SOCIAL_PLATFORMS.map((platform) => (
              <Field key={platform} name={`socialLinks.${platform}`}>
                {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label={SOCIAL_LABELS[platform] ?? platform}
                    placeholder={`https://${platform}.com/...`}
                    fullWidth
                    margin="normal"
                    error={
                      !!(formik.touched.socialLinks as Record<string, boolean> | undefined)?.[platform] &&
                      !!(formik.errors.socialLinks as Record<string, string> | undefined)?.[platform]
                    }
                    helperText={
                      (formik.touched.socialLinks as Record<string, boolean> | undefined)?.[platform] &&
                      (formik.errors.socialLinks as Record<string, string> | undefined)?.[platform]
                    }
                    disabled={isDisabled}
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                  />
                )}
              </Field>
            ))}

            {/* Submit */}
            {canEdit && (
              <Box sx={{ mt: 3, display: "flex", alignItems: "center", gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isPending || !isDirty}
                >
                  {isPending ? "Saving..." : "Save Settings"}
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
