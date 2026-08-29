"use client";

/**
 * Segment Edit Client — Milestone 15.6.1.
 *
 * Loads existing rules into the builder for modification.
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
import { updateSegmentAction } from "@/features/segmentation/actions/segment-actions";
import { formatRuleSummary } from "@/features/segmentation/utils/validate-segment-rules";
import type { SegmentRule, SegmentRuleGroup, SegmentField, ComparisonOperator, LogicalOperator } from "@/features/segmentation/types/segment";

type EntityOption = { id: string; name: string };

type Props = {
  tenantSlug: string;
  segmentId: string;
  initialName: string;
  initialDescription: string;
  initialRules: SegmentRuleGroup;
  services: EntityOption[];
  locations: EntityOption[];
  resources: EntityOption[];
};

const FIELD_OPTIONS: Array<{ value: SegmentField; label: string; type: "numeric" | "boolean" | "date" | "entity" }> = [
  { value: "completed_appointments", label: "Completed appointments", type: "numeric" },
  { value: "total_appointments", label: "Total appointments", type: "numeric" },
  { value: "cancelled_appointments", label: "Cancelled appointments", type: "numeric" },
  { value: "no_show_count", label: "No-shows", type: "numeric" },
  { value: "days_since_last_appointment", label: "Days since last appointment", type: "numeric" },
  { value: "has_upcoming_appointment", label: "Has upcoming appointment", type: "boolean" },
  { value: "has_active_package", label: "Has active package", type: "boolean" },
  { value: "has_gift_card", label: "Has gift card", type: "boolean" },
  { value: "was_referred", label: "Was referred", type: "boolean" },
  { value: "has_referred_others", label: "Has referred others", type: "boolean" },
  { value: "has_left_review", label: "Has left review", type: "boolean" },
  { value: "review_count", label: "Review count", type: "numeric" },
  { value: "successful_referral_count", label: "Successful referrals", type: "numeric" },
  { value: "marketing_opt_in", label: "Marketing opt-in", type: "boolean" },
  { value: "has_booked_service", label: "Has booked service", type: "entity" },
  { value: "has_visited_location", label: "Has visited location", type: "entity" },
  { value: "net_paid_amount", label: "Net paid amount (minor units)", type: "numeric" },
];

const NUMERIC_OPERATORS: Array<{ value: ComparisonOperator; label: string }> = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "greater_than", label: "greater than" },
  { value: "greater_than_or_equal", label: "at least" },
  { value: "less_than", label: "less than" },
  { value: "less_than_or_equal", label: "at most" },
];

const BOOLEAN_OPERATORS: Array<{ value: ComparisonOperator; label: string }> = [
  { value: "is_true", label: "Yes" },
  { value: "is_false", label: "No" },
];

export default function SegmentEditClient({
  tenantSlug,
  segmentId,
  initialName,
  initialDescription,
  initialRules,
  services,
  locations,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [logicalOp, setLogicalOp] = useState<LogicalOperator>(initialRules.operator ?? "and");
  const [rules, setRules] = useState<SegmentRule[]>(
    (initialRules.rules?.filter((r) => !("rules" in r)) ?? []) as SegmentRule[]
  );
  const [error, setError] = useState<string | null>(null);

  const addRule = () => {
    setRules([...rules, { field: "completed_appointments", operator: "greater_than_or_equal", value: 1 }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, partial: Partial<SegmentRule>) => {
    setRules(rules.map((r, i) => i === index ? { ...r, ...partial } : r));
  };

  const getFieldType = (field: SegmentField) => FIELD_OPTIONS.find((f) => f.value === field)?.type ?? "numeric";

  const buildRuleGroup = (): SegmentRuleGroup => ({
    operator: logicalOp,
    rules: rules,
  });

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateSegmentAction(tenantSlug, segmentId, {
        name,
        description: description || undefined,
        rules: buildRuleGroup(),
      });
      if (result.success) {
        router.push(`/${tenantSlug}/customers/segments/${segmentId}`);
      } else {
        setError(result.message);
      }
    });
  };

  const summary = rules.length > 0 ? formatRuleSummary(buildRuleGroup()) : "All customers";

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* Name & Description */}
      <Stack spacing={2}>
        <TextField label="Segment Name" value={name} onChange={(e) => setName(e.target.value)} size="small" required fullWidth />
        <TextField label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} size="small" fullWidth multiline rows={2} />
      </Stack>

      {/* Logical operator */}
      <FormControl size="small" sx={{ maxWidth: 200 }}>
        <InputLabel>Match</InputLabel>
        <Select value={logicalOp} label="Match" onChange={(e) => setLogicalOp(e.target.value as LogicalOperator)}>
          <MenuItem value="and">All conditions (AND)</MenuItem>
          <MenuItem value="or">Any condition (OR)</MenuItem>
        </Select>
      </FormControl>

      {/* Rules */}
      <Stack spacing={1.5}>
        {rules.map((rule, idx) => {
          const fieldType = getFieldType(rule.field);
          return (
            <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              {/* Field */}
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <Select value={rule.field} onChange={(e) => updateRule(idx, { field: e.target.value as SegmentField })}>
                  {FIELD_OPTIONS.map((f) => (
                    <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Operator */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={rule.operator}
                  onChange={(e) => updateRule(idx, { operator: e.target.value as ComparisonOperator })}
                >
                  {(fieldType === "boolean" ? BOOLEAN_OPERATORS : NUMERIC_OPERATORS).map((op) => (
                    <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Value */}
              {fieldType === "numeric" && (
                <TextField
                  type="number"
                  size="small"
                  value={rule.value}
                  onChange={(e) => updateRule(idx, { value: Number(e.target.value) })}
                  sx={{ width: 100 }}
                />
              )}

              {fieldType === "entity" && (
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={String(rule.value ?? "")}
                    onChange={(e) => updateRule(idx, { value: e.target.value })}
                  >
                    {(rule.field === "has_booked_service" ? services : locations).map((e) => (
                      <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Remove */}
              <IconButton size="small" onClick={() => removeRule(idx)} aria-label="Remove condition">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}

        <Button onClick={addRule} startIcon={<AddIcon />} size="small" variant="text" sx={{ alignSelf: "flex-start" }}>
          Add condition
        </Button>
      </Stack>

      {/* Summary */}
      <Box sx={{ p: 2, bgcolor: "rgba(124, 58, 237, 0.08)", borderRadius: 1.5 }}>
        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, color: "#a78bfa" }}>
          {summary}
        </Typography>
      </Box>

      {/* Actions */}
      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" onClick={handleSave} disabled={pending || !name.trim()} size="small">
          Update Segment
        </Button>
        <Button variant="outlined" href={`/${tenantSlug}/customers/segments/${segmentId}`} size="small">
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}
