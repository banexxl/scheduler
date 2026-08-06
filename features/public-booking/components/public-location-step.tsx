"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import type { PublicBookableLocation } from "../types/public-booking";
import { getPublicLocationsAction } from "../actions/get-public-locations-action";

type Props = {
  tenantSlug: string;
  tenantId: string;
  serviceId: string;
  onSelect: (locationId: string) => void;
  onBack: () => void;
};

export default function PublicLocationStep({ tenantSlug, serviceId, onSelect, onBack }: Props) {
  const [locations, setLocations] = useState<PublicBookableLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getPublicLocationsAction(tenantSlug, serviceId);
      if (result.success) {
        setLocations(result.data);
        // Auto-select if only one
        if (result.data.length === 1) {
          onSelect(result.data[0]!.id);
        }
      }
      setLoading(false);
    }
    load();
  }, [tenantSlug, serviceId, onSelect]);

  if (loading) return <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Choose a location</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {locations.map((loc) => (
          <Paper
            key={loc.id}
            variant="outlined"
            sx={{ p: 2, cursor: "pointer", "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" } }}
            onClick={() => onSelect(loc.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(loc.id); }}
          >
            <Typography variant="subtitle1" fontWeight={600}>{loc.name}</Typography>
            {loc.city && <Typography variant="body2" color="text.secondary">{loc.city}</Typography>}
            {loc.streetAddress && <Typography variant="caption" color="text.secondary">{loc.streetAddress}</Typography>}
          </Paper>
        ))}
      </Box>
      <Button onClick={onBack} sx={{ mt: 2 }} variant="text">Back</Button>
    </Box>
  );
}
