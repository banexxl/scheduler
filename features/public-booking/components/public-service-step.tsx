"use client";

/**
 * Public Service Step — Milestones 6.11, 8.5.
 *
 * Enhanced service discovery with:
 * - Category navigation (chips/tabs)
 * - Service cards with description, duration, price
 * - Simple search by name
 * - Empty state
 * - Keyboard accessible
 */

import { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import type { PublicBookableService } from "../types/public-booking";

type Props = {
  services: PublicBookableService[];
  showPrices: boolean;
  showDuration: boolean;
  onSelect: (service: PublicBookableService) => void;
};

export default function PublicServiceStep({ services, showPrices, showDuration, onSelect }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Map<string, string>();
    for (const s of services) {
      if (s.categoryId && s.categoryName) {
        cats.set(s.categoryId, s.categoryName);
      }
    }
    return [...cats.entries()].map(([id, name]) => ({ id, name }));
  }, [services]);

  // Filter services
  const filtered = useMemo(() => {
    let result = services;
    if (selectedCategory) {
      result = result.filter((s) => s.categoryId === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.categoryName ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [services, selectedCategory, search]);

  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        Choose a service
      </Typography>

      {/* Search (show when 5+ services) */}
      {services.length >= 5 && (
        <TextField
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Typography variant="body2" color="text.secondary">🔍</Typography>
                </InputAdornment>
              ),
            },
          }}
        />
      )}

      {/* Category chips */}
      {categories.length > 1 && (
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 2, overflowX: "auto" }}>
          <Chip
            label="All"
            onClick={() => setSelectedCategory(null)}
            color={selectedCategory === null ? "primary" : "default"}
            variant={selectedCategory === null ? "filled" : "outlined"}
            size="small"
          />
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              onClick={() => setSelectedCategory(cat.id)}
              color={selectedCategory === cat.id ? "primary" : "default"}
              variant={selectedCategory === cat.id ? "filled" : "outlined"}
              size="small"
            />
          ))}
        </Box>
      )}

      {/* Service list */}
      {filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          No services match your search.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {filtered.map((service) => (
            <Paper
              key={service.id}
              variant="outlined"
              sx={{
                p: 2,
                cursor: "pointer",
                transition: "border-color 0.15s, box-shadow 0.15s",
                "&:hover": { borderColor: "primary.main", boxShadow: 1 },
                "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
              }}
              onClick={() => onSelect(service)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(service); } }}
              aria-label={`Select ${service.name}`}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {service.name}
                  </Typography>
                  {service.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                      {service.description}
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", gap: 1.5, mt: 0.75, flexWrap: "wrap" }}>
                    {showDuration && (
                      <Typography variant="caption" color="text.secondary">
                        {service.durationMinutes} min
                      </Typography>
                    )}
                    {service.categoryName && (
                      <Typography variant="caption" color="text.secondary">
                        {service.categoryName}
                      </Typography>
                    )}
                  </Box>
                </Box>
                {showPrices && parseFloat(service.price) > 0 && (
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    color="primary.main"
                    sx={{ ml: 2, whiteSpace: "nowrap" }}
                  >
                    {service.price} {service.currency}
                  </Typography>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}
