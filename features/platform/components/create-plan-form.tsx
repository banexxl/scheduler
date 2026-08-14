"use client";

/**
 * Create Plan Form — Milestone 15.13.
 *
 * Client component for creating billing plans with:
 * - Currency autocomplete with search (all Polar-supported currencies)
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
import Tooltip from "@mui/material/Tooltip";
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

    const priceWhole = Number(formData.get("priceWhole") ?? "0");
    const currencyCode = currency.code;
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase());
    const priceAmount = isZeroDecimal ? priceWhole : Math.round(priceWhole * 100);

    const submissionData = new FormData();
    submissionData.set("planKey", formData.get("planKey") as string);
    submissionData.set("name", formData.get("name") as string);
    submissionData.set("description", formData.get("description") as string);
    submissionData.set("sortOrder", formData.get("sortOrder") as string);
    submissionData.set("isFree", isFree ? "on" : "");
    submissionData.set("priceAmount", String(priceAmount));
    submissionData.set("priceCurrency", currencyCode.toLowerCase());
    submissionData.set("billingType", billingType);
    submissionData.set("recurringInterval", formData.get("recurringInterval") as string ?? "month");
    submissionData.set("recurringIntervalCount", formData.get("recurringIntervalCount") as string ?? "1");
    submissionData.set("trialDays", formData.get("trialDays") as string ?? "0");

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
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Row 1: Plan key + Name */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <Tooltip title="Unique identifier used in code (e.g. free, pro, business). Cannot be changed later." arrow>
            <TextField
              size="small"
              name="planKey"
              label="Plan Key"
              required
              placeholder="e.g. pro"
              sx={{ minWidth: 180 }}
            />
          </Tooltip>
          <Tooltip title="Display name shown to customers on the pricing page." arrow>
            <TextField
              size="small"
              name="name"
              label="Plan Name"
              required
              fullWidth
              placeholder="e.g. Pro Plan"
            />
          </Tooltip>
        </Stack>

        {/* Row 2: Description + Sort */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <Tooltip title="Short description of what the plan includes. Shown on the pricing page." arrow>
            <TextField
              size="small"
              name="description"
              label="Description"
              fullWidth
              placeholder="e.g. For growing businesses"
            />
          </Tooltip>
          <Tooltip title="Display order on the pricing page. Lower numbers appear first." arrow>
            <TextField
              size="small"
              name="sortOrder"
              label="Sort Order"
              type="number"
              defaultValue="100"
              sx={{ width: 120 }}
            />
          </Tooltip>
        </Stack>

        {/* Free toggle */}
        <Tooltip title="Free plans have no price and are not synced to Polar. Tenants get them by default." arrow placement="right">
          <FormControlLabel
            control={<Switch checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />}
            label="Free plan (no payment required)"
            sx={{ width: "fit-content" }}
          />
        </Tooltip>

        {/* Pricing — hidden when free */}
        {!isFree && (
          <>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Pricing</Typography>

            {/* Row 3: Price + Currency + Billing type */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="flex-start">
              <Tooltip title="Price in whole units (e.g. 29 for $29). Automatically converted to cents for Polar." arrow>
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
              </Tooltip>

              <Tooltip title="Currency for this plan. Must match what Polar supports." arrow>
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
              </Tooltip>

              <Tooltip title="Recurring charges the customer periodically. One-time charges once." arrow>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Billing Type</InputLabel>
                  <Select
                    value={billingType}
                    label="Billing Type"
                    onChange={(e) => setBillingType(e.target.value as "recurring" | "one_time")}
                  >
                    <MenuItem value="recurring">Recurring</MenuItem>
                    <MenuItem value="one_time">One-time</MenuItem>
                  </Select>
                </FormControl>
              </Tooltip>
            </Stack>

            {/* Row 4: Interval + Interval count (recurring only) */}
            {billingType === "recurring" && (
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <Tooltip title="How often the customer is billed (monthly or yearly)." arrow>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Interval</InputLabel>
                    <Select name="recurringInterval" defaultValue="month" label="Interval">
                      <MenuItem value="month">Monthly</MenuItem>
                      <MenuItem value="year">Yearly</MenuItem>
                    </Select>
                  </FormControl>
                </Tooltip>
                <Tooltip title="Bill every N intervals. E.g. 3 months = quarterly billing." arrow>
                  <TextField
                    size="small"
                    name="recurringIntervalCount"
                    label="Every N intervals"
                    type="number"
                    defaultValue="1"
                    inputProps={{ min: 1, max: 12 }}
                    sx={{ width: 150 }}
                  />
                </Tooltip>
              </Stack>
            )}

            {/* Row 5: Trial days (separate row for clarity) */}
            {billingType === "recurring" && (
              <Tooltip title="Number of free trial days before the first charge. Set to 0 for no trial." arrow>
                <TextField
                  size="small"
                  name="trialDays"
                  label="Free Trial Days"
                  type="number"
                  defaultValue="0"
                  inputProps={{ min: 0, max: 365 }}
                  helperText="How many days before the first charge"
                  sx={{ width: 200 }}
                />
              </Tooltip>
            )}

            {/* Hidden fields for one-time billing */}
            {billingType === "one_time" && (
              <>
                <input type="hidden" name="recurringInterval" value="month" />
                <input type="hidden" name="recurringIntervalCount" value="1" />
                <input type="hidden" name="trialDays" value="0" />
              </>
            )}
          </>
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
          sx={{ alignSelf: "flex-start", mt: 1 }}
        >
          {submitting ? <CircularProgress size={20} /> : "Create Plan"}
        </Button>
      </Stack>
    </form>
  );
}
