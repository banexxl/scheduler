"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { updateTenantPaymentSettingsAction } from "@/features/payments/actions/update-payment-settings-action";
import type { TenantPaymentSettings } from "@/features/payments/types/payment-settings";

type Props = {
  tenantSlug: string;
  initialSettings: TenantPaymentSettings;
  providerAvailable: boolean;
};

export default function PaymentSettingsClient({ tenantSlug, initialSettings, providerAvailable }: Props) {
  const [enabled, setEnabled] = useState(initialSettings.onlinePaymentsEnabled);
  const [requirement, setRequirement] = useState(initialSettings.defaultPaymentRequirement);
  const [deadline, setDeadline] = useState(initialSettings.paymentDeadlineMinutes);
  const [allowPayLater, setAllowPayLater] = useState(initialSettings.allowPayLater);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const result = await updateTenantPaymentSettingsAction(tenantSlug, {
      onlinePaymentsEnabled: enabled,
      defaultPaymentRequirement: requirement,
      paymentDeadlineMinutes: deadline,
      allowPayLater,
    });
    setSaving(false);
    setMessage(result.success ? "Settings saved." : ("error" in result ? result.error : "Failed."));
  }

  return (
    <Box>
      {!providerAvailable && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Payment provider is not configured. Online payments cannot be enabled until platform setup is complete.
        </Alert>
      )}

      <FormControlLabel
        control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} disabled={!providerAvailable} />}
        label="Enable online appointment payments"
        sx={{ mb: 2, display: "block" }}
      />

      {enabled && (
        <Box sx={{ pl: 2, borderLeft: "2px solid", borderColor: "divider", mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Default payment requirement</Typography>
          <RadioGroup value={requirement} onChange={(e) => setRequirement(e.target.value as "none" | "full")}>
            <FormControlLabel value="none" control={<Radio />} label="Pay at business (no online payment required)" />
            <FormControlLabel value="full" control={<Radio />} label="Require full online payment" />
          </RadioGroup>

          <TextField
            label="Payment deadline (minutes)"
            type="number"
            value={deadline}
            onChange={(e) => setDeadline(Math.max(5, Math.min(60, Number(e.target.value))))}
            size="small"
            sx={{ mt: 2, width: 200 }}
            slotProps={{ htmlInput: { min: 5, max: 60 } }}
            helperText="Time customers have to complete payment (5–60 min)"
          />

          <FormControlLabel
            control={<Switch checked={allowPayLater} onChange={(e) => setAllowPayLater(e.target.checked)} />}
            label="Allow pay-at-business option for customers"
            sx={{ mt: 2, display: "block" }}
          />
        </Box>
      )}

      {message && (
        <Alert severity={message === "Settings saved." ? "success" : "error"} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      <Button variant="contained" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Payment Settings"}
      </Button>
    </Box>
  );
}
