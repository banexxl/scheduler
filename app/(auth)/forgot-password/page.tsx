import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ForgotPasswordForm from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Forgot Password
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        sx={{ mb: 3 }}
      >
        Enter your email and we will send you a reset link.
      </Typography>
      <ForgotPasswordForm />
    </Paper>
  );
}
