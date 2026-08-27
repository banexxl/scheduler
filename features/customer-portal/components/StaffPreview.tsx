/**
 * Staff Preview Section — Milestone 16.4.
 *
 * Server component that renders a preview of the tenant's team
 * on the public homepage.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Avatar from "@mui/material/Avatar";
import type { PublicStaffItem } from "@/features/public-site/services/public-site-resolver";

type Props = {
  staff: PublicStaffItem[];
};

export default function StaffPreview({ staff }: Props) {
  if (staff.length === 0) return null;

  // Show first 8 staff members
  const preview = staff.slice(0, 8);

  return (
    <Box component="section" aria-labelledby="staff-preview-heading" sx={{ maxWidth: 900, mx: "auto", px: 2, py: 5 }}>
      <Typography id="staff-preview-heading" component="h2" sx={{ fontSize: "1.25rem", fontWeight: 700, mb: 3, textAlign: "center" }}>
        Our Team
      </Typography>

      <Grid container spacing={2} justifyContent="center">
        {preview.map((member) => (
          <Grid key={member.id} size={{ xs: 6, sm: 4, md: 3 }}>
            <Box sx={{ textAlign: "center" }}>
              {member.avatarUrl ? (
                <Avatar
                  src={member.avatarUrl}
                  alt={member.displayName}
                  sx={{ width: 80, height: 80, mx: "auto", mb: 1 }}
                />
              ) : (
                <Avatar sx={{ width: 80, height: 80, mx: "auto", mb: 1, bgcolor: "primary.main", fontSize: "1.5rem" }}>
                  {member.displayName.charAt(0).toUpperCase()}
                </Avatar>
              )}
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{member.displayName}</Typography>
              {member.jobTitle && (
                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{member.jobTitle}</Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
