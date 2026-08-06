"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import type { PublicBookableService } from "../types/public-booking";

type Props = {
  services: PublicBookableService[];
  showPrices: boolean;
  showDuration: boolean;
  onSelect: (service: PublicBookableService) => void;
};

export default function PublicServiceStep({ services, showPrices, showDuration, onSelect }: Props) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Choose a service</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {services.map((service) => (
          <Paper
            key={service.id}
            variant="outlined"
            sx={{ p: 2, cursor: "pointer", "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" } }}
            onClick={() => onSelect(service)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(service); }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>{service.name}</Typography>
                {service.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {service.description}
                  </Typography>
                )}
                {showDuration && (
                  <Typography variant="caption" color="text.secondary">
                    {service.durationMinutes} min
                  </Typography>
                )}
              </Box>
              {showPrices && parseFloat(service.price) > 0 && (
                <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                  {service.price} {service.currency}
                </Typography>
              )}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
