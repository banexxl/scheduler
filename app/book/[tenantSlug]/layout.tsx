import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

/**
 * Public booking layout — Milestone 6.11.
 * Separate from the authenticated business layout.
 * No authentication required. Minimal chrome.
 */
export default function PublicBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
        {children}
      </Container>
    </Box>
  );
}
