"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import type { LocationListItem } from "@/features/locations/services/get-business-locations";

type ServiceLocationPickerProps = {
  /** All locations belonging to the tenant */
  locations: LocationListItem[];
  /** Currently assigned location IDs */
  selectedLocationIds: string[];
  /** Callback to update selected IDs (managed by parent) */
  onChange: (locationIds: string[]) => void;
  /** Whether controls are interactive */
  disabled: boolean;
  /** Whether the user can edit */
  canEdit: boolean;
  /** Optional error message from the action */
  error?: string | null;
};

/**
 * Multi-select checkbox list for assigning locations to a service.
 * This component is controlled — the parent manages the selected state.
 */
export default function ServiceLocationPicker({
  locations,
  selectedLocationIds,
  onChange,
  disabled,
  canEdit,
  error,
}: ServiceLocationPickerProps) {
  const handleToggle = (locationId: string) => {
    if (!canEdit) return;
    const current = new Set(selectedLocationIds);
    if (current.has(locationId)) {
      current.delete(locationId);
    } else {
      current.add(locationId);
    }
    onChange(Array.from(current));
  };

  if (locations.length === 0) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary">
          No locations have been created yet. Create a location first to assign services to it.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Select the locations where this service is offered. A service can be offered at multiple locations.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      <FormGroup>
        {locations.map((loc) => (
          <FormControlLabel
            key={loc.id}
            control={
              <Checkbox
                checked={selectedLocationIds.includes(loc.id)}
                onChange={() => handleToggle(loc.id)}
                disabled={disabled || !canEdit}
              />
            }
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>{loc.name}</span>
                {!loc.isActive && (
                  <Chip label="Inactive" size="small" variant="outlined" color="default" />
                )}
              </Box>
            }
          />
        ))}
      </FormGroup>
    </Box>
  );
}
