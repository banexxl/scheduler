"use client";

/**
 * Plan Form — Milestone 15.13.
 *
 * Dual-mode client component for creating AND editing billing plans. These
 * admin forms manage paid, Polar-mapped plans only (there is no "free" toggle —
 * free plans are managed outside these forms).
 *
 * CREATE mode (no `selectedPlan`):
 * - Price (whole units, converted to cents), currency, billing type, interval, trial.
 *
 * EDIT mode (`selectedPlan` provided):
 * - Fields prefilled from the selected plan.
 * - Plan Key is locked (immutable after creation).
 * - Billing type + interval are locked (Polar locks the pricing model at
 *   creation), shown disabled for context.
 * - Price amount, currency, and trial ARE editable. Saving archives the old
 *   Polar price and creates a new one — existing subscribers keep their price,
 *   only new purchases use the new amount.
 * - Submit button becomes "Update Plan"; a "Cancel" button clears the selection.
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
import toast from "react-hot-toast";
import { SUPPORTED_CURRENCIES, ZERO_DECIMAL_CURRENCIES } from "@/features/business/utils/supported-currencies";

/** Shape needed to prefill the form when editing. */
export type EditablePlan = {
  id: string;
  planKey: string;
  name: string;
  description: string | null;
  isFree: boolean;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  features: string[];
  /** Current pricing (from the first active price), for prefill. */
  priceAmount: number | null; // minor units (cents)
  priceCurrency: string | null;
  isRecurring: boolean;
  recurringInterval: "month" | "year" | null;
  recurringIntervalCount: number | null;
  trialDays: number | null;
};

type CurrencyOption = { code: string; name: string };

type Props = {
  /** Create action — returns an error message string, or null on success. */
  action: (formData: FormData) => Promise<string | null>;
  /** Update action — returns an error message string, or null on success. */
  updateAction?: (formData: FormData) => Promise<string | null>;
  /** When set, the form renders in edit mode prefilled with this plan. */
  selectedPlan?: EditablePlan | null;
  /** Called after a successful create/update or when the user cancels editing. */
  onDone?: () => void;
};

/** Convert stored minor units (cents) to a whole-unit string for the input. */
function centsToWhole(amount: number | null, currencyCode: string): string {
  if (amount == null) return "";
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase());
  return String(isZeroDecimal ? amount : amount / 100);
}

function findCurrency(code: string | null): CurrencyOption {
  const match = code
    ? SUPPORTED_CURRENCIES.find((c) => c.code.toLowerCase() === code.toLowerCase())
    : undefined;
  return match ?? SUPPORTED_CURRENCIES[0]!;
}

export default function CreatePlanForm({ action, updateAction, selectedPlan, onDone }: Props) {
  const isEditing = Boolean(selectedPlan);

  // State is initialized directly from `selectedPlan`. The parent remounts this
  // component (via a React `key` tied to the selection) whenever the selected
  // plan changes, so these initializers re-run with the right values.
  const [isActive, setIsActive] = useState(selectedPlan?.isActive ?? true);
  const [isPublic, setIsPublic] = useState(selectedPlan?.isPublic ?? true);
  const [currency, setCurrency] = useState<CurrencyOption>(
    isEditing ? findCurrency(selectedPlan!.priceCurrency) : SUPPORTED_CURRENCIES[0]!
  );
  const [billingType, setBillingType] = useState<"recurring" | "one_time">(
    isEditing ? (selectedPlan!.isRecurring ? "recurring" : "one_time") : "recurring"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildPriceAmount(formData: FormData): number {
    const priceWhole = Number(formData.get("priceWhole") ?? "0");
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.code.toUpperCase());
    return isZeroDecimal ? priceWhole : Math.round(priceWhole * 100);
  }

  async function handleCreate(formData: FormData) {
    const submissionData = new FormData();
    submissionData.set("planKey", formData.get("planKey") as string);
    submissionData.set("name", formData.get("name") as string);
    submissionData.set("description", formData.get("description") as string);
    submissionData.set("sortOrder", formData.get("sortOrder") as string);
    submissionData.set("features", String(formData.get("features") ?? ""));
    submissionData.set("priceAmount", String(buildPriceAmount(formData)));
    submissionData.set("priceCurrency", currency.code.toLowerCase());
    submissionData.set("billingType", billingType);
    submissionData.set("recurringInterval", String(formData.get("recurringInterval") || "month"));
    submissionData.set("recurringIntervalCount", String(formData.get("recurringIntervalCount") || "1"));
    submissionData.set("trialDays", String(formData.get("trialDays") || "0"));

    const errorMessage = await action(submissionData);
    if (errorMessage) {
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    toast.success("Plan created successfully!");
    onDone?.();
  }

  async function handleUpdate(formData: FormData) {
    if (!updateAction || !selectedPlan) return;

    const submissionData = new FormData();
    submissionData.set("id", selectedPlan.id);
    submissionData.set("name", formData.get("name") as string);
    submissionData.set("description", formData.get("description") as string);
    submissionData.set("sortOrder", formData.get("sortOrder") as string);
    submissionData.set("features", String(formData.get("features") ?? ""));
    submissionData.set("isActive", isActive ? "on" : "");
    submissionData.set("isPublic", isPublic ? "on" : "");
    // Pricing — only for paid plans. Type + interval are locked, so we send the
    // plan's existing model unchanged alongside the (editable) amount, currency,
    // and trial. Free plans have no price section, so we skip these entirely.
    if (!selectedPlan.isFree) {
      submissionData.set("priceAmount", String(buildPriceAmount(formData)));
      submissionData.set("priceCurrency", currency.code.toLowerCase());
      submissionData.set("billingType", selectedPlan.isRecurring ? "recurring" : "one_time");
      submissionData.set("recurringInterval", selectedPlan.recurringInterval ?? "month");
      submissionData.set("recurringIntervalCount", String(selectedPlan.recurringIntervalCount ?? 1));
      submissionData.set("trialDays", String(formData.get("trialDays") || "0"));
    }

    const errorMessage = await updateAction(submissionData);
    if (errorMessage) {
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    toast.success("Plan updated successfully!");
    onDone?.();
  }

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing) {
        await handleUpdate(formData);
      } else {
        await handleCreate(formData);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : isEditing ? "Failed to update plan" : "Failed to create plan";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // In edit mode the billing model is locked; interval controls are shown disabled.
  const isRecurring = isEditing ? selectedPlan!.isRecurring : billingType === "recurring";
  // Free plans have no Polar price to edit — creating is always paid, and when
  // editing an (already) free plan we only expose metadata/state fields.
  const editingFreePlan = isEditing && selectedPlan!.isFree;
  const showPricing = !editingFreePlan;

  return (
    <form action={handleSubmit}>
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        {isEditing && !editingFreePlan && (
          <Alert severity="info">
            Editing <strong>{selectedPlan!.planKey}</strong>. Plan key and billing model (type/interval) are
            locked. Changing the price affects new purchases only — existing subscribers keep their current price.
          </Alert>
        )}
        {editingFreePlan && (
          <Alert severity="info">
            Editing free plan <strong>{selectedPlan!.planKey}</strong>. Free plans have no price — you can edit
            the name, description, order, and visibility here.
          </Alert>
        )}

        {/* Row 1: Plan key + Name */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <Tooltip title="Unique identifier used in code (e.g. pro, business). Cannot be changed after creation." arrow>
            <TextField
              size="small"
              name="planKey"
              label="Plan Key"
              required={!isEditing}
              disabled={isEditing}
              placeholder="e.g. pro"
              defaultValue={selectedPlan?.planKey ?? ""}
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
              defaultValue={selectedPlan?.name ?? ""}
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
              defaultValue={selectedPlan?.description ?? ""}
            />
          </Tooltip>
          <Tooltip title="Display order on the pricing page. Lower numbers appear first." arrow>
            <TextField
              size="small"
              name="sortOrder"
              label="Sort Order"
              type="number"
              defaultValue={selectedPlan ? String(selectedPlan.sortOrder) : "100"}
              sx={{ width: 120 }}
            />
          </Tooltip>
        </Stack>

        {/* Feature bullets — one per line, shown on the marketing pricing card. */}
        <Tooltip title="One feature per line. These render as the checklist on the marketing pricing card." arrow>
          <TextField
            size="small"
            name="features"
            label="Features (one per line)"
            fullWidth
            multiline
            minRows={3}
            placeholder={"Unlimited bookings\nEmail & SMS reminders\nCustom branding"}
            defaultValue={selectedPlan ? selectedPlan.features.join("\n") : ""}
          />
        </Tooltip>

        {/* State toggles — edit mode only (create defaults both to true) */}
        {isEditing && (
          <Stack direction="row" spacing={2}>
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
              label="Active"
            />
            <FormControlLabel
              control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
              label="Public"
            />
          </Stack>
        )}

        {showPricing && (
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
                  required
                  placeholder="e.g. 29"
                  inputProps={{ min: 0, step: "0.01" }}
                  defaultValue={selectedPlan ? centsToWhole(selectedPlan.priceAmount, currency.code) : ""}
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

              <Tooltip
                title={
                  isEditing
                    ? "Billing type is locked at creation and cannot be changed."
                    : "Recurring charges the customer periodically. One-time charges once."
                }
                arrow
              >
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Billing Type</InputLabel>
                  <Select
                    value={billingType}
                    label="Billing Type"
                    disabled={isEditing}
                    onChange={(e) => setBillingType(e.target.value as "recurring" | "one_time")}
                  >
                    <MenuItem value="recurring">Recurring</MenuItem>
                    <MenuItem value="one_time">One-time</MenuItem>
                  </Select>
                </FormControl>
              </Tooltip>
            </Stack>

            {/* Row 4: Interval + Interval count (recurring only) */}
            {isRecurring && (
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <Tooltip
                  title={isEditing ? "Interval is locked at creation." : "How often the customer is billed (monthly or yearly)."}
                  arrow
                >
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Interval</InputLabel>
                    <Select
                      name="recurringInterval"
                      defaultValue={selectedPlan?.recurringInterval ?? "month"}
                      label="Interval"
                      disabled={isEditing}
                    >
                      <MenuItem value="month">Monthly</MenuItem>
                      <MenuItem value="year">Yearly</MenuItem>
                    </Select>
                  </FormControl>
                </Tooltip>
                <Tooltip
                  title={isEditing ? "Interval count is locked at creation." : "Bill every N intervals. E.g. 3 months = quarterly billing."}
                  arrow
                >
                  <TextField
                    size="small"
                    name="recurringIntervalCount"
                    label="Every N intervals"
                    type="number"
                    defaultValue={selectedPlan ? String(selectedPlan.recurringIntervalCount ?? 1) : "1"}
                    disabled={isEditing}
                    inputProps={{ min: 1, max: 12 }}
                    sx={{ width: 150 }}
                  />
                </Tooltip>
              </Stack>
            )}

            {/* Row 5: Trial days — editable in both modes (recurring only) */}
            {isRecurring && (
              <Tooltip title="Number of free trial days before the first charge. Set to 0 for no trial." arrow>
                <TextField
                  size="small"
                  name="trialDays"
                  label="Free Trial Days"
                  type="number"
                  defaultValue={selectedPlan ? String(selectedPlan.trialDays ?? 0) : "0"}
                  inputProps={{ min: 0, max: 365 }}
                  helperText="How many days before the first charge"
                  sx={{ width: 200 }}
                />
              </Tooltip>
            )}

            {/* Hidden fields for one-time billing */}
            {!isRecurring && (
              <>
                <input type="hidden" name="recurringInterval" value="month" />
                <input type="hidden" name="recurringIntervalCount" value="1" />
                <input type="hidden" name="trialDays" value="0" />
              </>
            )}
          </>
        )}

        <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{ alignSelf: "flex-start" }}
          >
            {submitting ? <CircularProgress size={20} /> : isEditing ? "Update Plan" : "Create Plan"}
          </Button>
          {isEditing && (
            <Button
              type="button"
              variant="outlined"
              disabled={submitting}
              onClick={() => onDone?.()}
            >
              Cancel
            </Button>
          )}
        </Stack>
      </Stack>
    </form>
  );
}
