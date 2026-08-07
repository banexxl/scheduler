"use client";

/**
 * Public Location Step — Milestones 6.11, 8.5.
 *
 * Enhanced location selection with:
 * - Polished cards (name, city, address, description)
 * - Auto-select when only one location
 * - Loading skeleton
 * - Empty state
 * - Keyboard accessible
 */

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
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
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      const result = await getPublicLocationsAction(tenantSlug, serviceId);
      if (cancelled) return;
      if (result.success) {
        setLocations(result.data);
        if (result.data.length === 1) {
          onSelect(result.data[0]!.id);
        }
      } else {
        setError("Unable to load locations.");
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, serviceId]);

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" component="h2" gutterBottom>Choose a location</Typography>
        <Stack spacing={1.5}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={80} />
          ))}
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h6" component="h2" gutterBottom>Choose a location</Typography>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button onClick={onBack} variant="text">Back</Button>
      </Box>
    );
  }

  if (locations.length === 0) {
    return (
      <Box>
        <Typography variant="h6" component="h2" gutterBottom>Choose a location</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No locations are currently available for this service.
        </Typography>
        <Button onClick={onBack} variant="text">Back</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>Choose a location</Typography>
      <Stack spacing={1.5}>
        {locations.map((loc) => (
          <Paper
            key={loc.id}
            variant="outlined"
            sx={{
              p: 2,
              cursor: "pointer",
              transition: "border-color 0.15s, box-shadow 0.15s",
              "&:hover": { borderColor: "primary.main", boxShadow: 1 },
              "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
            }}
            onClick={() => onSelect(loc.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(loc.id); } }}
            aria-label={`Select ${loc.name}`}
          >
            <Typography variant="subtitle1" fontWeight={600}>{loc.name}</Typography>
            {loc.city && (
              <Typography variant="body2" color="text.secondary">{loc.city}</Typography>
            )}
            {loc.streetAddress && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                {loc.streetAddress}
              </Typography>
            )}
            {loc.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              >
                {loc.description}
              </Typography>
            )}
          </Paper>
        ))}
      </Stack>
      <Button onClick={onBack} sx={{ mt: 2 }} variant="text">Back</Button>
    </Box>
  );
}
