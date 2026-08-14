"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { Formik, Form, Field, type FormikProps } from "formik";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import ListSubheader from "@mui/material/ListSubheader";
import CircularProgress from "@mui/material/CircularProgress";
import {
  createBusinessSchema,
  type CreateBusinessFormValues,
} from "../schemas/create-business-schema";
import { generateTenantSlug } from "@/lib/tenants/generate-tenant-slug";
import {
  isValidTenantSlugFormat,
  isReservedTenantSlug,
} from "@/lib/tenants/validate-tenant-slug";
import { getBrowserTimezone } from "@/lib/helpers/get-browser-timezone";
import { getSafeDefaultCurrency } from "../utils/get-default-currency";
import { SUPPORTED_CURRENCIES } from "../utils/supported-currencies";
import { getTimezoneListWithDetected } from "../utils/timezone-list";
import { useBusinessSlugAvailability } from "../hooks/use-business-slug-availability";
import {
  createBusinessAction,
  type CreateBusinessActionResult,
} from "../actions/create-business";
import BusinessUrlPreview from "./business-url-preview";
import SlugAvailabilityIndicator from "./slug-availability-indicator";

/**
 * Safely detect browser timezone (client-only).
 */
function detectTimezone(): string {
  try {
    return getBrowserTimezone();
  } catch {
    return "Europe/Belgrade";
  }
}

/**
 * Safely detect default currency (client-only).
 */
function detectCurrency(): string {
  try {
    return getSafeDefaultCurrency();
  } catch {
    return "EUR";
  }
}

/**
 * Business creation form.
 *
 * Milestone 4.4: Calls the create_tenant RPC via server action.
 * On success, the server action redirects to /${tenantSlug}/onboarding.
 */
export default function CreateBusinessForm({ selectedPlanId }: { selectedPlanId?: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] =
    useState<CreateBusinessActionResult | null>(null);

  // Track whether the user has manually edited the slug
  const slugManuallyEdited = useRef<boolean | null>(null);
  if (slugManuallyEdited.current == null) {
    slugManuallyEdited.current = false;
  }

  // Detect browser timezone and currency once (lazy state initializer)
  const [detectedTimezone] = useState(detectTimezone);
  const [detectedCurrency] = useState(detectCurrency);

  // Track current slug for availability hook
  const [currentSlug, setCurrentSlug] = useState("");

  const timezoneOptions = getTimezoneListWithDetected(detectedTimezone);

  // Group timezones for rendering
  const groupedTimezones: Array<[string, typeof timezoneOptions]> = [];
  const groupMap = new Map<string, typeof timezoneOptions>();
  for (const tz of timezoneOptions) {
    const existing = groupMap.get(tz.group);
    if (existing) {
      existing.push(tz);
    } else {
      const arr = [tz];
      groupMap.set(tz.group, arr);
      groupedTimezones.push([tz.group, arr]);
    }
  }

  // Slug availability hook
  const isLocallyValid = isValidTenantSlugFormat(currentSlug);
  const isReserved = isReservedTenantSlug(currentSlug);

  const availability = useBusinessSlugAvailability({
    slug: currentSlug,
    isLocallyValid,
    isReserved,
  });

  const initialValues: CreateBusinessFormValues = {
    businessName: "",
    tenantSlug: "",
    primaryLocationName: "Main Location",
    timezone: detectedTimezone,
    currency: detectedCurrency,
  };

  const handleBusinessNameChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      formik: FormikProps<CreateBusinessFormValues>
    ) => {
      const newName = e.target.value;
      formik.setFieldValue("businessName", newName);

      // Auto-generate slug unless user manually edited
      if (!slugManuallyEdited.current) {
        const generated = generateTenantSlug(newName);
        formik.setFieldValue("tenantSlug", generated);
        setCurrentSlug(generated);
      }
    },
    []
  );

  const handleSlugChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      formik: FormikProps<CreateBusinessFormValues>
    ) => {
      slugManuallyEdited.current = true;
      const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      formik.setFieldValue("tenantSlug", raw);
      setCurrentSlug(raw);
      // Clear slug-related action errors when user edits
      if (actionResult?.fieldErrors?.tenantSlug) {
        setActionResult(null);
      }
    },
    [actionResult]
  );

  const handleResetSlug = useCallback(
    (formik: FormikProps<CreateBusinessFormValues>) => {
      slugManuallyEdited.current = false;
      const currentName = formik.values.businessName;
      const generated = generateTenantSlug(currentName);
      formik.setFieldValue("tenantSlug", generated);
      setCurrentSlug(generated);
      if (actionResult?.fieldErrors?.tenantSlug) {
        setActionResult(null);
      }
    },
    [actionResult]
  );

  // Submission eligibility: all fields valid + slug confirmed available
  const isSlugConfirmedAvailable =
    availability.status === "available" &&
    availability.confirmedSlug === currentSlug;

  const handleFormSubmit = (values: CreateBusinessFormValues) => {
    // Double-check availability is confirmed for the current slug
    if (!isSlugConfirmedAvailable) {
      return;
    }

    setActionResult(null);

    startTransition(async () => {
      const result = await createBusinessAction({
        businessName: values.businessName.trim(),
        tenantSlug: values.tenantSlug.trim().toLowerCase(),
        primaryLocationName: values.primaryLocationName.trim(),
        timezone: values.timezone,
        currency: values.currency,
        selectedPlanId: selectedPlanId ?? undefined,
      });
      // If we reach here, the action did NOT redirect (i.e. there was an error)
      setActionResult(result);
    });
  };

  const isSubmitting = isPending;

  return (
    <Formik<CreateBusinessFormValues>
      initialValues={initialValues}
      validationSchema={createBusinessSchema}
      onSubmit={handleFormSubmit}
      validateOnBlur
      validateOnChange={false}
    >
      {(formik) => (
        <Box
          component={Form}
          noValidate
          aria-label="Create business form"
        >
          {/* General action error */}
          {actionResult && !actionResult.success && actionResult.message && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionResult.message}
            </Alert>
          )}

          {/* Business Name */}
          <Field name="businessName">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleBusinessNameChange(e, formik)
                }
                label="Business Name"
                placeholder="e.g. John's Barbershop"
                fullWidth
                margin="normal"
                error={
                  (!!formik.touched.businessName && !!formik.errors.businessName) ||
                  !!actionResult?.fieldErrors?.businessName
                }
                helperText={
                  (formik.touched.businessName && formik.errors.businessName) ||
                  actionResult?.fieldErrors?.businessName ||
                  "The name your customers will see"
                }
                disabled={isSubmitting}
                autoFocus
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
            )}
          </Field>

          {/* Business Slug / Address */}
          <Field name="tenantSlug">
            {({ field }: { field: { name: string; value: string; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSlugChange(e, formik)
                }
                label="Business Address"
                placeholder="e.g. johns-barbershop"
                fullWidth
                margin="normal"
                error={
                  (!!formik.touched.tenantSlug && !!formik.errors.tenantSlug) ||
                  availability.status === "unavailable" ||
                  !!actionResult?.fieldErrors?.tenantSlug
                }
                helperText={
                  (formik.touched.tenantSlug && formik.errors.tenantSlug) ||
                  actionResult?.fieldErrors?.tenantSlug ||
                  "Lowercase letters, numbers, and hyphens. This becomes your unique URL."
                }
                disabled={isSubmitting}
                slotProps={{
                  htmlInput: { maxLength: 63 },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        {availability.status === "checking" ? (
                          <CircularProgress size={18} aria-label="Checking availability" />
                        ) : (
                          <Tooltip title="Reset from business name">
                            <IconButton
                              onClick={() => handleResetSlug(formik)}
                              edge="end"
                              size="small"
                              aria-label="Reset slug suggestion from business name"
                              disabled={isSubmitting}
                            >
                              ↺
                            </IconButton>
                          </Tooltip>
                        )}
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
          </Field>

          {/* Slug Availability Status */}
          {currentSlug && !formik.errors.tenantSlug && !actionResult?.fieldErrors?.tenantSlug && (
            <SlugAvailabilityIndicator
              status={availability.status}
              message={availability.message}
              onRetry={availability.retry}
            />
          )}

          {/* URL Preview */}
          <Box sx={{ my: 2 }}>
            <BusinessUrlPreview slug={formik.values.tenantSlug} />
          </Box>

          {/* Primary Location Name */}
          <Field name="primaryLocationName">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                label="Primary Location Name"
                placeholder="e.g. Downtown Branch"
                fullWidth
                margin="normal"
                error={
                  (!!formik.touched.primaryLocationName &&
                    !!formik.errors.primaryLocationName) ||
                  !!actionResult?.fieldErrors?.primaryLocationName
                }
                helperText={
                  (formik.touched.primaryLocationName &&
                    formik.errors.primaryLocationName) ||
                  actionResult?.fieldErrors?.primaryLocationName ||
                  "Your main business location. You can add more later."
                }
                disabled={isSubmitting}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
            )}
          </Field>

          {/* Timezone */}
          <Field name="timezone">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                select
                label="Timezone"
                fullWidth
                margin="normal"
                error={
                  (!!formik.touched.timezone && !!formik.errors.timezone) ||
                  !!actionResult?.fieldErrors?.timezone
                }
                helperText={
                  (formik.touched.timezone && formik.errors.timezone) ||
                  actionResult?.fieldErrors?.timezone ||
                  "Business operating timezone"
                }
                disabled={isSubmitting}
              >
                {groupedTimezones.map(([group, tzList]) => [
                  <ListSubheader key={`group-${group}`}>
                    {group}
                  </ListSubheader>,
                  ...tzList.map((tz) => (
                    <MenuItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </MenuItem>
                  )),
                ])}
              </TextField>
            )}
          </Field>

          {/* Currency */}
          <Field name="currency">
            {({ field }: { field: { name: string; value: string; onChange: React.ChangeEventHandler; onBlur: React.FocusEventHandler } }) => (
              <TextField
                {...field}
                select
                label="Currency"
                fullWidth
                margin="normal"
                error={
                  (!!formik.touched.currency && !!formik.errors.currency) ||
                  !!actionResult?.fieldErrors?.currency
                }
                helperText={
                  (formik.touched.currency && formik.errors.currency) ||
                  actionResult?.fieldErrors?.currency ||
                  "Primary billing currency"
                }
                disabled={isSubmitting}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Field>

          {/* Submit */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isSubmitting || !isSlugConfirmedAvailable}
            sx={{ mt: 3 }}
          >
            {isSubmitting ? "Creating business..." : "Create Business"}
          </Button>
        </Box>
      )}
    </Formik>
  );
}
