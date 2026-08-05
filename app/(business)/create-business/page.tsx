import { redirect } from "next/navigation";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { resolveUserIdentity } from "@/features/auth/services/resolve-user-identity";
import CreateBusinessForm from "@/features/business/components/create-business-form";

/**
 * Business creation onboarding page.
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
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 6 } }}>
      {/* Progress indicator */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
        <Chip label="Step 1 of 1" size="small" variant="outlined" />
      </Box>

      {/* Header */}
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ textAlign: "center", fontWeight: 600 }}
      >
        Create your business
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ textAlign: "center", mb: 4 }}
      >
        Set up the basics now. You can add services, team members, locations
        and branding later.
      </Typography>

      {/* Form card */}
      <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 } }}>
        <CreateBusinessForm />
      </Paper>

      {/* Footer links */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Link
          component={NextLink}
          href="/account"
          variant="body2"
          color="text.secondary"
        >
          Go to my account
        </Link>
        <Typography variant="body2" color="text.secondary">
          Signed in as {user.email}
        </Typography>
      </Box>
    </Container>
  );
}
