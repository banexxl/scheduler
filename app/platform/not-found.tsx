import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function PlatformNotFound() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 2, bgcolor: "primary.main", color: "primary.contrastText", p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Page not found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This platform page does not exist.
      </Typography>
      <Button href="/platform/dashboard" variant="outlined">
        Back to Platform
      </Button>
    </Box>
  );
}
