import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

/**
 * Global Not Found Page — Milestones 10.3, 15.13.
 *
 * Shown when a route does not exist or notFound() is called.
 * "Go Home" navigates to user's appropriate dashboard via /api/home.
 * Does not reveal whether a resource exists (safe for enumeration prevention).
 */
export default function NotFoundPage() {
  return (
    <Box
      sx={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Paper
        elevation={2}
        sx={{ p: 4, maxWidth: 480, textAlign: "center", borderRadius: 3 }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Page not found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          The page you are looking for does not exist or you do not have access.
        </Typography>
        <Button variant="outlined" component="a" href="/api/home">
          Go Home
        </Button>
      </Paper>
    </Box>
  );
}
