"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import type { ServiceLocationWithService } from "../types/service-location";

type LocationAssignedServicesProps = {
  services: ServiceLocationWithService[];
  tenantSlug: string;
};

/**
 * Read-only list of services assigned to a location.
 * Shown on the location edit page for visibility.
 * The authoritative assignment editor is the service form.
 */
export default function LocationAssignedServices({
  services,
  tenantSlug,
}: LocationAssignedServicesProps) {
  if (services.length === 0) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary">
          No services are assigned to this location yet. Assign services from the service edit page.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        These services are offered at this location. To change assignments, edit the service.
      </Typography>
      {services.map((svc) => (
        <Paper key={svc.id} variant="outlined" sx={{ p: 1.5, mb: 1, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 150 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Link
                component="a"
                href={`/${tenantSlug}/services/${svc.serviceId}/edit`}
                variant="body2"
                sx={{ fontWeight: 600 }}
              >
                {svc.serviceName}
              </Link>
              {!svc.serviceIsActive && (
                <Chip label="Service Inactive" size="small" variant="outlined" color="default" />
              )}
              {!svc.isActive && (
                <Chip label="Assignment Inactive" size="small" variant="outlined" color="warning" />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {svc.serviceDurationMinutes} min
              {svc.servicePrice > 0 && ` \u2022 ${svc.servicePrice} ${svc.serviceCurrency}`}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
