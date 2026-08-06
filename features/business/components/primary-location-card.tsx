import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import type { BusinessDashboardData } from "../services/get-business-dashboard";

type PrimaryLocationCardProps = {
  location: BusinessDashboardData["primaryLocation"];
  tenantSlug: string;
};

/**
 * Card displaying the primary location details or an empty state.
 */
export default function PrimaryLocationCard({
  location,
  tenantSlug,
}: PrimaryLocationCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Primary Location
      </Typography>

      {location ? (
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {location.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Type: {location.locationType}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Timezone: {location.timezone}
          </Typography>
          {(location.city || location.country) && (
            <Typography variant="body2" color="text.secondary">
              {[location.city, location.country].filter(Boolean).join(", ")}
            </Typography>
          )}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No primary location configured.
        </Typography>
      )}

      <Box sx={{ mt: 2 }}>
        <Link
          component={NextLink}
          href={`/${tenantSlug}/locations`}
          variant="body2"
        >
          Manage locations
        </Link>
      </Box>
    </Paper>
  );
}
