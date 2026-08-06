"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import type { ServiceResourceWithService } from "../types/service-resource";
import { resolveServiceResourceValues } from "../utils/resolve-service-resource-values";

type ResourceAssignedServicesProps = {
  services: ServiceResourceWithService[];
  tenantSlug: string;
};

/**
 * Read-only list of services assigned to a resource.
 * Shown on the resource edit page for visibility.
 * The authoritative assignment editor is the service form.
 */
export default function ResourceAssignedServices({
  services,
  tenantSlug,
}: ResourceAssignedServicesProps) {
  if (services.length === 0) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary">
          No services are assigned to this resource yet. Assign services from the service edit page.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        This resource can perform the following services. To change assignments, edit the service.
      </Typography>
      {services.map((svc) => {
        const resolved = resolveServiceResourceValues(
          {
            durationMinutes: svc.serviceDurationMinutes,
            price: svc.servicePrice,
            currency: svc.serviceCurrency,
            bufferBeforeMinutes: svc.serviceBufferBeforeMinutes,
            bufferAfterMinutes: svc.serviceBufferAfterMinutes,
          },
          {
            durationOverrideMinutes: svc.durationOverrideMinutes,
            priceOverride: svc.priceOverride,
            currencyOverride: svc.currencyOverride,
            bufferBeforeOverrideMinutes: svc.bufferBeforeOverrideMinutes,
            bufferAfterOverrideMinutes: svc.bufferAfterOverrideMinutes,
          }
        );
        const hasOverrides = Object.values(resolved.overrides).some(Boolean);

        return (
          <Paper key={svc.id} variant="outlined" sx={{ p: 1.5, mb: 1, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 150 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Link
                  component={NextLink}
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
                {hasOverrides && (
                  <Chip label="Overrides" size="small" variant="outlined" color="info" />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {resolved.duration} min
                {resolved.price > 0 && ` \u2022 ${resolved.price} ${resolved.currency}`}
                {resolved.price === 0 && " \u2022 Free"}
              </Typography>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
