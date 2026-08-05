import { redirect } from "next/navigation";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { requireUser } from "@/lib/auth/require-user";
import { resolveUserIdentity } from "@/features/auth/services/resolve-user-identity";

/**
 * Placeholder: Business creation is not implemented yet.
 * This page requires authentication but not tenant membership.
 *
 * Route guard:
 * - Anonymous → /login (via requireUser)
 * - Active tenant member → /${tenantSlug}/dashboard (prevents re-onboarding)
 * - Platform admin → allowed (may access for now)
 * - Customer-only user → allowed
 * - New user with no relationships → allowed
 */
export default async function CreateBusinessPage() {
  const user = await requireUser();
  const identity = await resolveUserIdentity(user);

  // Prevent existing business members from re-onboarding
  const accessible = identity.tenantMemberships
    .filter((m) => m.tenantStatus === "active")
    .sort((a, b) => a.tenantName.localeCompare(b.tenantName));

  if (accessible.length > 0) {
    redirect(`/${accessible[0]!.tenantSlug}/dashboard`);
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={2} sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create Your Business
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Business onboarding will be implemented in the next phase.
        </Typography>
      </Paper>
    </Container>
  );
}
