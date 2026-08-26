import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { checkTenantAccess } from "@/lib/billing/subscription-guard";
import { redirect } from "next/navigation";
import { logoutAction } from "@/features/auth/actions/logout";

/**
 * Billing Required Page — Milestone 15.14.
 *
 * Shown when tenant's trial has expired or no subscription is active.
 * Provides clear messaging about the issue and CTAs to subscribe.
 */
export default async function BillingRequiredPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { user, tenant } = await requireTenantMember(tenantSlug);

  // Re-check access — if they're actually allowed, redirect to dashboard
  const result = await checkTenantAccess(tenant.id, user.id);
  if (result.access === "allowed") {
    redirect(`/${tenantSlug}/dashboard`);
  }

  // Calculate days since expiration
  let daysSinceExpiry: number | null = null;
  if (result.trialEndsAt) {
    const expiry = new Date(result.trialEndsAt);
    const now = new Date();
    daysSinceExpiry = Math.floor((now.getTime() - expiry.getTime()) / 86400000);
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", p: 3 }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3, textAlign: "center" }}>
          {/* Status */}
          <Chip
            label={result.access === "trial_expired" ? "Trial Expired" : "No Active Plan"}
            color="error"
            sx={{ mb: 2, fontWeight: 600 }}
          />

          {/* Title */}
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1.5 }}>
            {result.access === "trial_expired"
              ? "Your free trial has ended"
              : "Subscription required"}
          </Typography>

          {/* Message */}
          <Typography color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
            {result.access === "trial_expired" ? (
              <>
                Your 14-day free trial for <strong>{tenant.name}</strong> expired
                {daysSinceExpiry !== null && daysSinceExpiry > 0 && ` ${daysSinceExpiry} day${daysSinceExpiry !== 1 ? "s" : ""} ago`}.
                Subscribe to a plan to continue managing your appointments, services, and customers.
              </>
            ) : result.access === "no_trial" ? (
              <>
                Your business <strong>{tenant.name}</strong> doesn&apos;t have an active plan.
                Start a free trial or subscribe to access your dashboard.
              </>
            ) : (
              <>
                Your subscription for <strong>{tenant.name}</strong> is no longer active.
                Resubscribe to regain access to your dashboard.
              </>
            )}
          </Typography>

          {/* CTAs */}
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            <Button
              href={`/${tenantSlug}/settings/billing`}
              variant="contained"
              size="large"
              sx={{ fontWeight: 700, borderRadius: 2, py: 1.5 }}
            >
              {result.access === "no_trial" ? "Start Free Trial" : "Choose a Plan"}
            </Button>
            <Button
              href="/pricing"
              variant="outlined"
              size="small"
            >
              View Plans & Pricing
            </Button>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Footer info */}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Signed in as {user.email}
          </Typography>
          <form action={logoutAction}>
            <Button type="submit" variant="text" size="small" color="error">
              Sign Out
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
