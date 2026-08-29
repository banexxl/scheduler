"use client";

/**
 * Automation Builder Client — Milestone 15.8.
 *
 * Vertical step-sequence builder:
 * WHEN → [Steps] → Save as Draft
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { createAutomationAction } from "@/features/automations/actions/automation-actions";
import type { AutomationTriggerType, StepType } from "@/features/automations/types/automation";

type StepDraft = {
  stepType: StepType;
  config: Record<string, unknown>;
};

const TRIGGERS: Array<{ value: AutomationTriggerType; label: string }> = [
  { value: "appointment_completed", label: "Appointment Completed" },
  { value: "customer_inactive", label: "Customer Inactive" },
  { value: "package_expiring", label: "Package Expiring" },
  { value: "referral_rewarded", label: "Referral Rewarded" },
  { value: "gift_card_purchased", label: "Gift Card Purchased" },
  { value: "loyalty_threshold_reached", label: "Loyalty Threshold Reached" },
];

type Props = { tenantSlug: string };

export default function AutomationBuilderClient({ tenantSlug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>("appointment_completed");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({});
  const [steps, setSteps] = useState<StepDraft[]>([]);

  const addStep = (type: StepType) => {
    const config: Record<string, unknown> =
      type === "delay" ? { value: 2, unit: "days" } :
        type === "condition" ? { field: "has_upcoming_appointment", operator: "is_false", value: true } :
          { subject: "", content: "" };
    setSteps([...steps, { stepType: type, config }]);
  };

  const removeStep = (idx: number) => setSteps(steps.filter((_, i) => i !== idx));

  const updateStepConfig = (idx: number, key: string, value: unknown) => {
    setSteps(steps.map((s, i) => i === idx ? { ...s, config: { ...s.config, [key]: value } } : s));
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await createAutomationAction(tenantSlug, {
        name,
        triggerType,
        triggerConfig,
      });
      if (result.success && result.automationId) {
        router.push(`/${tenantSlug}/automations/${result.automationId}`);
      } else if (!result.success) {
        setError(result.message);
      }
    });
  };

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* Name */}
      <TextField label="Automation Name" value={name} onChange={(e) => setName(e.target.value)} size="small" required fullWidth placeholder="e.g. Post Visit Follow-Up" />

      {/* Trigger */}
      <FormControl size="small" fullWidth>
        <InputLabel>When (Trigger)</InputLabel>
        <Select value={triggerType} label="When (Trigger)" onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}>
          {TRIGGERS.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </Select>
      </FormControl>

      {/* Trigger Config */}
      {triggerType === "customer_inactive" && (
        <TextField label="Days Inactive" type="number" size="small" value={triggerConfig.days_inactive ?? 60} onChange={(e) => setTriggerConfig({ ...triggerConfig, days_inactive: Number(e.target.value) })} sx={{ maxWidth: 200 }} />
      )}
      {triggerType === "package_expiring" && (
        <TextField label="Days Before Expiry" type="number" size="small" value={triggerConfig.days_before_expiry ?? 7} onChange={(e) => setTriggerConfig({ ...triggerConfig, days_before_expiry: Number(e.target.value) })} sx={{ maxWidth: 200 }} />
      )}
      {triggerType === "loyalty_threshold_reached" && (
        <TextField label="Points Threshold" type="number" size="small" value={triggerConfig.points_threshold ?? 100} onChange={(e) => setTriggerConfig({ ...triggerConfig, points_threshold: Number(e.target.value) })} sx={{ maxWidth: 200 }} />
      )}

      {/* Steps */}
      <Box>
        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, mb: 1 }}>Steps</Typography>
        <Stack spacing={1.5}>
          {steps.map((step, idx) => (
            <Box key={idx} sx={{ p: 2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1.5, position: "relative" }}>
              <IconButton size="small" onClick={() => removeStep(idx)} sx={{ position: "absolute", top: 4, right: 4 }} aria-label="Remove step">
                <DeleteIcon fontSize="small" />
              </IconButton>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#8b8b9e", mb: 1 }}>
                {step.stepType === "delay" ? "Wait" : step.stepType === "condition" ? "Condition" : "Send Email"}
              </Typography>

              {step.stepType === "delay" && (
                <Stack direction="row" spacing={1}>
                  <TextField type="number" size="small" value={step.config.value ?? 2} onChange={(e) => updateStepConfig(idx, "value", Number(e.target.value))} sx={{ width: 80 }} />
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select value={step.config.unit ?? "days"} onChange={(e) => updateStepConfig(idx, "unit", e.target.value)}>
                      <MenuItem value="minutes">Minutes</MenuItem>
                      <MenuItem value="hours">Hours</MenuItem>
                      <MenuItem value="days">Days</MenuItem>
                      <MenuItem value="weeks">Weeks</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              )}

              {step.stepType === "condition" && (
                <TextField label="Condition (field)" size="small" value={step.config.field ?? ""} onChange={(e) => updateStepConfig(idx, "field", e.target.value)} fullWidth helperText="e.g. has_upcoming_appointment" />
              )}

              {step.stepType === "email" && (
                <Stack spacing={1}>
                  <TextField label="Subject" size="small" value={step.config.subject ?? ""} onChange={(e) => updateStepConfig(idx, "subject", e.target.value)} fullWidth />
                  <TextField label="Message" size="small" value={step.config.content ?? ""} onChange={(e) => updateStepConfig(idx, "content", e.target.value)} fullWidth multiline rows={3} />
                  <TextField label="CTA Text (optional)" size="small" value={step.config.cta_text ?? ""} onChange={(e) => updateStepConfig(idx, "cta_text", e.target.value)} fullWidth />
                  <TextField label="CTA URL (optional)" size="small" value={step.config.cta_url ?? ""} onChange={(e) => updateStepConfig(idx, "cta_url", e.target.value)} fullWidth />
                </Stack>
              )}
            </Box>
          ))}

          <Stack direction="row" spacing={1}>
            <Button size="small" variant="text" startIcon={<AddIcon />} onClick={() => addStep("delay")}>Wait</Button>
            <Button size="small" variant="text" startIcon={<AddIcon />} onClick={() => addStep("condition")}>Condition</Button>
            <Button size="small" variant="text" startIcon={<AddIcon />} onClick={() => addStep("email")}>Email</Button>
          </Stack>
        </Stack>
      </Box>

      {/* Preview */}
      {steps.length > 0 && (
        <Box sx={{ p: 2, bgcolor: "rgba(124, 58, 237, 0.08)", borderRadius: 1.5 }}>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#a78bfa", mb: 0.5 }}>Flow Preview</Typography>
          <Typography sx={{ fontSize: "0.8125rem", fontFamily: "monospace", color: "#8b8b9e" }}>
            WHEN {triggerType.replace(/_/g, " ")}
            {steps.map((s) => {
              if (s.stepType === "delay") return `\n  → Wait ${s.config.value} ${s.config.unit}`;
              if (s.stepType === "condition") return `\n  → If ${String(s.config.field).replace(/_/g, " ")}`;
              if (s.stepType === "email") return `\n  → Send "${s.config.subject}"`;
              return "";
            }).join("")}
          </Typography>
        </Box>
      )}

      {/* Actions */}
      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" size="small" onClick={handleSave} disabled={pending || !name.trim()}>
          Save as Draft
        </Button>
        <Button variant="outlined" href={`/${tenantSlug}/automations`} size="small">
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}
