"use client";

/**
 * Automation Edit Client — Milestone 15.8.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import { updateAutomationAction } from "@/features/automations/actions/automation-actions";
import type { AutomationTriggerType } from "@/features/automations/types/automation";

const TRIGGERS: Array<{ value: AutomationTriggerType; label: string }> = [
  { value: "appointment_completed", label: "Appointment Completed" },
  { value: "customer_inactive", label: "Customer Inactive" },
  { value: "package_expiring", label: "Package Expiring" },
  { value: "referral_rewarded", label: "Referral Rewarded" },
  { value: "gift_card_purchased", label: "Gift Card Purchased" },
  { value: "loyalty_threshold_reached", label: "Loyalty Threshold Reached" },
];

type Props = {
  tenantSlug: string;
  automationId: string;
  initialName: string;
  initialDescription: string;
  initialTriggerType: string;
  initialTriggerConfig: Record<string, unknown>;
};

export default function AutomationEditClient({
  tenantSlug,
  automationId,
  initialName,
  initialDescription,
  initialTriggerType,
  initialTriggerConfig,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>(initialTriggerType as AutomationTriggerType);
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(initialTriggerConfig);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateAutomationAction(tenantSlug, automationId, {
        name,
        description: description || undefined,
        triggerType,
        triggerConfig,
      });
      if (result.success) {
        router.push(`/${tenantSlug}/automations/${automationId}`);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      <TextField label="Automation Name" value={name} onChange={(e) => setName(e.target.value)} size="small" required fullWidth />
      <TextField label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} size="small" fullWidth multiline rows={2} />

      <FormControl size="small" fullWidth>
        <InputLabel>Trigger</InputLabel>
        <Select value={triggerType} label="Trigger" onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}>
          {TRIGGERS.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </Select>
      </FormControl>

      {triggerType === "customer_inactive" && (
        <TextField label="Days Inactive" type="number" size="small" value={triggerConfig.days_inactive ?? 60} onChange={(e) => setTriggerConfig({ ...triggerConfig, days_inactive: Number(e.target.value) })} sx={{ maxWidth: 200 }} />
      )}
      {triggerType === "package_expiring" && (
        <TextField label="Days Before Expiry" type="number" size="small" value={triggerConfig.days_before_expiry ?? 7} onChange={(e) => setTriggerConfig({ ...triggerConfig, days_before_expiry: Number(e.target.value) })} sx={{ maxWidth: 200 }} />
      )}
      {triggerType === "loyalty_threshold_reached" && (
        <TextField label="Points Threshold" type="number" size="small" value={triggerConfig.points_threshold ?? 100} onChange={(e) => setTriggerConfig({ ...triggerConfig, points_threshold: Number(e.target.value) })} sx={{ maxWidth: 200 }} />
      )}

      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" onClick={handleSave} disabled={pending || !name.trim()} size="small">Save Changes</Button>
        <Button variant="outlined" href={`/${tenantSlug}/automations/${automationId}`} size="small">Cancel</Button>
      </Stack>
    </Stack>
  );
}
