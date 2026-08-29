import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

const ERROR_MESSAGES: Record<string, string> = {
  confirmation_failed:
    "We were unable to confirm your email. The link may have expired.",
  callback_failed:
    "Authentication failed. Please try signing in again.",
  oauth_failed:
    "Unable to sign in with your social account. Please try again.",
  invalid_link:
    "The link you followed is invalid or has expired.",
  session_required:
    "You need to be signed in to access that page.",
  unknown: "An unexpected error occurred.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = params.code ?? "unknown";
  const message = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        py: 4,
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            textAlign: "center",
            bgcolor: "rgba(22, 22, 30, 0.7)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(16px)",
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 700, color: "#f0f0f5" }}
          >
            Authentication Error
          </Typography>
          <Typography sx={{ mb: 3, color: "#8b8b9e" }}>
            {message}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button
              href="/login"
              variant="contained"
              sx={{
                textTransform: "none",
                background: "linear-gradient(135deg, #7C3AED, #a855f7)",
                "&:hover": { background: "linear-gradient(135deg, #6D28D9, #9333ea)" },
              }}
            >
              Sign In
            </Button>
            <Button
              href="/forgot-password"
              variant="outlined"
              sx={{
                textTransform: "none",
                borderColor: "rgba(255,255,255,0.12)",
                color: "#a0a0b8",
                "&:hover": { borderColor: "rgba(124,58,237,0.4)", color: "#f0f0f5" },
              }}
            >
              Reset Password
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
