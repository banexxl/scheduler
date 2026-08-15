import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

/**
 * Auth pages layout — centers the form card on screen.
 * Shared by login, register, forgot-password, update-password, auth-error.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc", py: 4 }}>
      <Container maxWidth="xs">
        {children}
      </Container>
    </Box>
  );
}
