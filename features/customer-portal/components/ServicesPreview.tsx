/**
 * Services Preview Section — Milestone 16.4.
 *
 * Server component that renders a preview of the tenant's services
 * on the public homepage. Shows top services with name, duration, price.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import type { PublicServiceItem } from "@/features/public-site/services/public-site-resolver";

type Props = {
  services: PublicServiceItem[];
  tenantSlug: string;
};

export default function ServicesPreview({ services, tenantSlug }: Props) {
  if (services.length === 0) return null;

  // Show first 6 services
  const preview = services.slice(0, 6);

  return (
    <Box component="section" aria-labelledby="services-preview-heading" sx={{ maxWidth: 900, mx: "auto", px: 2, py: 5 }}>
      <Typography id="services-preview-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 3, textAlign: "center" }}>
        Our Services
      </Typography>

      <Grid container spacing={2}>
        {preview.map((service) => (
          <Grid key={service.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{service.name}</Typography>
              {service.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, flexGrow: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {service.description}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {service.durationMinutes} min &middot; {service.currency} {service.price}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {services.length > 6 && (
        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Button href={`/book/${tenantSlug}/services`} variant="outlined" size="small">
            View All Services
          </Button>
        </Box>
      )}
    </Box>
  );
}
