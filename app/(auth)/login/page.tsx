import { redirect } from "next/navigation";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { getUser } from "@/lib/auth/get-user";
import { resolveLoginDestination } from "@/features/auth/services/resolve-login-destination";
import LoginForm from "@/features/auth/components/login-form";

export default async function LoginPage() {
  const user = await getUser();

  if (user) {
    const destination = await resolveLoginDestination(user);
    redirect(destination);
  }

  return (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Sign In
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        sx={{ mb: 3 }}
      >
        Enter your credentials to access your account.
      </Typography>
      <LoginForm />
    </Paper>
  );
}
