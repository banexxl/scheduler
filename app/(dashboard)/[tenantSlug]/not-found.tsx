import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function DashboardNotFound() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Page not found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This page does not exist or you do not have access.
      </Typography>
      <Button href="/api/home" variant="outlined">
        Go to Dashboard
      </Button>
    </Box>
  );
}
