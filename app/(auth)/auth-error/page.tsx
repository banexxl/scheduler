import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

const ERROR_MESSAGES: Record<string, string> = {
  confirmation_failed:
    "We were unable to confirm your email. The link may have expired.",
  callback_failed:
    "Authentication failed. Please try signing in again.",
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
    <Paper elevation={2} sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Authentication Error
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        {message}
      </Typography>
      <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
        <Button href="/login" variant="contained">
          Sign In
        </Button>
        <Button href="/forgot-password" variant="outlined">
          Reset Password
        </Button>
      </Box>
    </Paper>
  );
}
