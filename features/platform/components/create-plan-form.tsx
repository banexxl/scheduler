"use client";

/**
 * Create Plan Form — Milestone 15.13.
 *
 * Client component for creating billing plans with:
 * - Currency autocomplete with search (all ISO 4217 currencies)
 * - Price entered in whole units (dollars/euros/dinars), converted to cents on submit
 * - Billing type selector (recurring/one-time)
 * - Interval selector (monthly/yearly)
 * - Trial days
 * - Free plan toggle (hides pricing fields)
 */

import { useState } from "react";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Autocomplete from "@mui/material/Autocomplete";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { SUPPORTED_CURRENCIES, ZERO_DECIMAL_CURRENCIES } from "@/features/business/utils/supported-currencies";

type Props = {
  action: (formData: FormData) => Promise<void>;
};

export default function CreatePlanForm({ action }: Props) {
  const [isFree, setIsFree] = useState(false);
  const [currency, setCurrency] = useState<{ code: string; name: string }>(SUPPORTED_CURRENCIES[0]!);
  const [billingType, setBillingType] = useState<"recurring" | "one_time">("recurring");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);

    // Convert whole units to cents (minor units)
    const priceWhole = Number(formData.get("priceWhole") ?? "0");
    const currencyCode = currency.code;
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase());
    const priceAmount = isZeroDecimal ? priceWhole : Math.round(priceWhole * 100);

    // Build proper FormData with converted values
    const submissionData = new FormData();
    submissionData.set("planKey", formData.get("planKey") as string);
    submissionData.set("name", formData.get("name") as string);
    submissionData.set("description", formData.get("description") as string);
    submissionData.set("sortOrder", formData.get("sortOrder") as string);
    submissionData.set("isFree", isFree ? "on" : "");
    submissionData.set("priceAmount", String(priceAmount));
    submissionData.set("priceCurrency", currencyCode.toLowerCase());
    submissionData.set("billingType", billingType);
    submissionData.set("recurringInterval", formData.get("recurringInterval") as string);
    submissionData.set("recurringIntervalCount", formData.get("recurringIntervalCount") as string);
    submissionData.set("trialDays", formData.get("trialDays") as string);

    try {
      await action(submissionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Basic info */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField size="small" name="planKey" label="Plan key" required placeholder="e.g. pro" />
          <TextField size="small" name="name" label="Name" required fullWidth placeholder="e.g. Pro Plan" />
          <TextField size="small" name="description" label="Description" fullWidth />
          <TextField size="small" name="sortOrder" label="Sort order" type="number" defaultValue="100" sx={{ width: 100 }} />
        </Stack>

        <FormControlLabel
          control={<Switch checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />}
          label="Free plan (no Polar product)"
        />

        {/* Pricing — hidden when free */}
        {!isFree && (
          <>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Pricing</Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="flex-start">
              <TextField
                size="small"
                name="priceWhole"
                label={`Price (${currency.code})`}
                type="number"
                required={!isFree}
                placeholder="e.g. 29"
                inputProps={{ min: 0, step: "0.01" }}
                sx={{ width: 160 }}
              />

              <Autocomplete
                size="small"
                options={[...SUPPORTED_CURRENCIES]}
                value={currency}
                onChange={(_, val) => { if (val) setCurrency(val); }}
                getOptionLabel={(opt) => `${opt.code} — ${opt.name}`}
                renderInput={(params) => <TextField {...params} label="Currency" />}
                isOptionEqualToValue={(opt, val) => opt.code === val.code}
                disableClearable
                sx={{ width: 280 }}
              />

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Billing type</InputLabel>
                <Select
                  value={billingType}
                  label="Billing type"
                  onChange={(e) => setBillingType(e.target.value as "recurring" | "one_time")}
                >
                  <MenuItem value="recurring">Recurring</MenuItem>
                  <MenuItem value="one_time">One-time</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {billingType === "recurring" && (
              <Stack direction="row" spacing={1.5}>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Interval</InputLabel>
                  <Select name="recurringInterval" defaultValue="month" label="Interval">
                    <MenuItem value="month">Monthly</MenuItem>
                    <MenuItem value="year">Yearly</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  name="recurringIntervalCount"
                  label="Every N"
                  type="number"
                  defaultValue="1"
                  inputProps={{ min: 1, max: 12 }}
                  sx={{ width: 90 }}
                />
                <TextField
                  size="small"
                  name="trialDays"
                  label="Trial days"
                  type="number"
                  defaultValue="0"
                  inputProps={{ min: 0 }}
                  sx={{ width: 110 }}
                />
              </Stack>
            )}

            {billingType === "one_time" && (
              <input type="hidden" name="recurringInterval" value="month" />
            )}
            {billingType === "one_time" && (
              <input type="hidden" name="recurringIntervalCount" value="1" />
            )}
            {billingType === "one_time" && (
              <input type="hidden" name="trialDays" value="0" />
            )}
          </>
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
          sx={{ alignSelf: "flex-start" }}
        >
          {submitting ? <CircularProgress size={20} /> : "Create Plan"}
        </Button>
      </Stack>
    </form>
  );
}
