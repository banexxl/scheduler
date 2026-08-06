import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import {
  getBusinessStatusLabel,
  getBusinessStatusColor,
  getMemberRoleLabel,
} from "../utils/status-labels";
import { clientEnvironment } from "@/lib/environment/client";

type BusinessDashboardHeaderProps = {
  businessName: string;
  businessSlug: string;
  businessStatus: string;
  memberRole: string;
};

/**
 * Dashboard header showing business name, status, role, and public URL preview.
 */
export default function BusinessDashboardHeader({
  businessName,
  businessSlug,
  businessStatus,
  memberRole,
}: BusinessDashboardHeaderProps) {
  const rootDomain = clientEnvironment.rootDomain;
  const publicUrl = `${businessSlug}.${rootDomain}`;

  return (
    <Box sx={{ mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
          mb: 1,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          {businessName}
        </Typography>
        <Chip
          label={getBusinessStatusLabel(businessStatus)}
          color={getBusinessStatusColor(businessStatus)}
          size="small"
        />
        <Chip
          label={getMemberRoleLabel(memberRole)}
          variant="outlined"
          size="small"
        />
      </Box>
      <Typography variant="body2" color="text.secondary">
        Public site URL:{" "}
        <Typography
          component="span"
          variant="body2"
          sx={{ fontFamily: "monospace" }}
        >
          {publicUrl}
        </Typography>
        {" — coming soon"}
      </Typography>
    </Box>
  );
}
