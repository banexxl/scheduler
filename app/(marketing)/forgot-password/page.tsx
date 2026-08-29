import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ForgotPasswordForm from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
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
            bgcolor: "rgba(22, 22, 30, 0.7)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(16px)",
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            align="center"
            sx={{ fontWeight: 700, color: "#f0f0f5" }}
          >
            Forgot Password
          </Typography>
          <Typography
            variant="body2"
            align="center"
            sx={{ mb: 3, color: "#8b8b9e" }}
          >
            Enter your email and we will send you a reset link.
          </Typography>
          <ForgotPasswordForm />
        </Paper>
      </Container>
    </Box>
  );
}
