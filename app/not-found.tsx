import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

/**
 * Global Not Found Page.
 * Uses root layout. Shows when no route matches.
 */
export default function NotFoundPage() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "primary.main", p: 3 }}>
      <Container maxWidth="xs">
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Page not found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The page you are looking for does not exist or you do not have access.
          </Typography>
          <Button href="/api/home" variant="outlined">
            Go Home
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
