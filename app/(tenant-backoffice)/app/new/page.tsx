import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { requireUser } from "@/lib/auth/require-user";

/**
 * Placeholder: Tenant onboarding is not implemented yet.
 * This page requires authentication but not tenant membership.
 */
export default async function NewTenantPage() {
  await requireUser();

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={2} sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create Workspace
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Tenant onboarding will be available in a future update.
        </Typography>
      </Paper>
    </Container>
  );
}
