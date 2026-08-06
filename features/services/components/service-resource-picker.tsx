"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import type { Resource } from "@/features/resources/types/resource";
import type { ServiceResourceAssignmentInput } from "../types/service-resource";

type ServiceResourcePickerProps = {
  /** All resources belonging to the tenant */
  resources: Resource[];
  /** Current assignment state */
  assignments: ServiceResourceAssignmentInput[];
  /** Callback when assignments change */
  onChange: (assignments: ServiceResourceAssignmentInput[]) => void;
  /** Whether controls are interactive */
  disabled: boolean;
  /** Whether the user can edit */
  canEdit: boolean;
  /** Optional error message */
  error?: string | null;
};

/**
 * Multi-select resource picker with optional override fields.
 * Each selected resource can have duration, price, currency, and buffer overrides.
 */
export default function ServiceResourcePicker({
  resources,
  assignments,
  onChange,
  disabled,
  canEdit,
  error,
}: ServiceResourcePickerProps) {
  const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(new Set());

  const isSelected = (resourceId: string) =>
    assignments.some((a) => a.resourceId === resourceId);

  const getAssignment = (resourceId: string) =>
    assignments.find((a) => a.resourceId === resourceId);

  const handleToggle = (resourceId: string) => {
    if (!canEdit) return;
    if (isSelected(resourceId)) {
      onChange(assignments.filter((a) => a.resourceId !== resourceId));
      setExpandedOverrides((prev) => { const next = new Set(prev); next.delete(resourceId); return next; });
    } else {
      onChange([...assignments, { resourceId, isActive: true }]);
    }
  };

  const handleOverrideChange = (resourceId: string, field: keyof ServiceResourceAssignmentInput, value: unknown) => {
    onChange(assignments.map((a) =>
      a.resourceId === resourceId ? { ...a, [field]: value } : a
    ));
  };

  const toggleOverrides = (resourceId: string) => {
    setExpandedOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) next.delete(resourceId);
      else next.add(resourceId);
      return next;
    });
  };

  if (resources.length === 0) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary">
          No resources have been created yet. Create a resource first to assign it to services.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Select resources that can perform this service. Leave override fields blank to use the service defaults.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      <FormGroup>
        {resources.map((res) => {
          const selected = isSelected(res.id);
          const asg = getAssignment(res.id);
          const showOverrides = expandedOverrides.has(res.id);

          return (
            <Box key={res.id} sx={{ mb: selected ? 1.5 : 0 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selected}
                    onChange={() => handleToggle(res.id)}
                    disabled={disabled || !canEdit}
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>{res.name}</span>
                    <Chip label={res.resourceTypeName} size="small" variant="outlined" />
                    {!res.isActive && (
                      <Chip label="Inactive" size="small" variant="outlined" color="default" />
                    )}
                  </Box>
                }
              />

              {selected && (
                <Box sx={{ ml: 4, mt: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      color="primary"
                      sx={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => toggleOverrides(res.id)}
                    >
                      {showOverrides ? "Hide overrides" : "Advanced overrides"}
                    </Typography>
                    {asg && (asg.durationOverrideMinutes != null || asg.priceOverride != null || asg.bufferBeforeOverrideMinutes != null || asg.bufferAfterOverrideMinutes != null) && (
                      <Chip label="Has overrides" size="small" color="info" variant="outlined" />
                    )}
                  </Box>

                  <Collapse in={showOverrides}>
                    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 1 }}>
                      <TextField
                        label="Duration (min)"
                        type="number"
                        size="small"
                        sx={{ width: 130 }}
                        value={asg?.durationOverrideMinutes ?? ""}
                        onChange={(e) => handleOverrideChange(res.id, "durationOverrideMinutes", e.target.value === "" ? null : Number(e.target.value))}
                        disabled={disabled || !canEdit}
                        placeholder="Service default"
                        slotProps={{ htmlInput: { min: 5, max: 1440 } }}
                      />
                      <TextField
                        label="Price"
                        type="number"
                        size="small"
                        sx={{ width: 110 }}
                        value={asg?.priceOverride ?? ""}
                        onChange={(e) => handleOverrideChange(res.id, "priceOverride", e.target.value === "" ? null : Number(e.target.value))}
                        disabled={disabled || !canEdit}
                        placeholder="Default"
                        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                      />
                      <TextField
                        label="Currency"
                        size="small"
                        sx={{ width: 90 }}
                        value={asg?.currencyOverride ?? ""}
                        onChange={(e) => handleOverrideChange(res.id, "currencyOverride", e.target.value === "" ? null : e.target.value.toUpperCase())}
                        disabled={disabled || !canEdit}
                        placeholder="Default"
                        slotProps={{ htmlInput: { maxLength: 3, style: { textTransform: "uppercase" } } }}
                      />
                      <TextField
                        label="Buffer before"
                        type="number"
                        size="small"
                        sx={{ width: 120 }}
                        value={asg?.bufferBeforeOverrideMinutes ?? ""}
                        onChange={(e) => handleOverrideChange(res.id, "bufferBeforeOverrideMinutes", e.target.value === "" ? null : Number(e.target.value))}
                        disabled={disabled || !canEdit}
                        placeholder="Default"
                        slotProps={{ htmlInput: { min: 0, max: 1440 } }}
                      />
                      <TextField
                        label="Buffer after"
                        type="number"
                        size="small"
                        sx={{ width: 120 }}
                        value={asg?.bufferAfterOverrideMinutes ?? ""}
                        onChange={(e) => handleOverrideChange(res.id, "bufferAfterOverrideMinutes", e.target.value === "" ? null : Number(e.target.value))}
                        disabled={disabled || !canEdit}
                        placeholder="Default"
                        slotProps={{ htmlInput: { min: 0, max: 1440 } }}
                      />
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Box>
          );
        })}
      </FormGroup>
    </Box>
  );
}
