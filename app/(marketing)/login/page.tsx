import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
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
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        // Offset the fixed marketing header (~64px) so the form's top
        // isn't clipped when the content is vertically centered on mobile.
        pt: { xs: "88px", sm: 4 },
        pb: 4,
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
            Sign In
          </Typography>
          <Typography
            variant="body2"
            align="center"
            sx={{ mb: 3, color: "#8b8b9e" }}
          >
            Enter your credentials to access your account.
          </Typography>
          <LoginForm />
        </Paper>
      </Container>
    </Box>
  );
}
