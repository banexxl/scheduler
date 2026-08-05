import { redirect } from "next/navigation";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { getUser } from "@/lib/auth/get-user";
import UpdatePasswordForm from "@/features/auth/components/update-password-form";

export default async function UpdatePasswordPage() {
  const user = await getUser();

  if (!user) {
    redirect("/forgot-password");
  }

  return (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Update Password
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        sx={{ mb: 3 }}
      >
        Choose a new password for your account.
      </Typography>
      <UpdatePasswordForm />
    </Paper>
  );
}
