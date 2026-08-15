import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function BookingNotFound() {
  return (
    <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Box sx={{ textAlign: "center", maxWidth: 400 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Page not found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          The page you are looking for does not exist or this business is unavailable.
        </Typography>
        <Button href="/" variant="outlined">
          Go Home
        </Button>
      </Box>
    </Box>
  );
}
