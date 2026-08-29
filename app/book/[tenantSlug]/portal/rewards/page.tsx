import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import Button from "@mui/material/Button";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import { requirePortalSession } from "@/features/customer-portal/services/require-portal-session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Customer Portal — Rewards Page.
 *
 * Shows loyalty points and active packages for this tenant.
 */
export default async function PortalRewardsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { session, tenant } = await requirePortalSession(tenantSlug);

  if (!session.customerId) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", py: 3, px: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ maxWidth: 600, mx: "auto" }}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" fontWeight={700}>{tenant.name}</Typography>
                <Typography variant="body2" color="text.secondary">Rewards</Typography>
              </Box>
              <Button component="a" href={`/book/${tenantSlug}/portal`} variant="outlined" size="small">
                Back to Portal
              </Button>
            </Stack>
          </Paper>
          <Paper elevation={1} sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
            <CardGiftcardIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No rewards yet</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Complete appointments to start earning rewards
            </Typography>
          </Paper>
        </Box>
      </Box>
    );
  }

  const adminClient = createAdminClient();

  // Load loyalty account
  const { data: loyaltyRow } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("customer_loyalty_accounts" as never)
    .select("points_balance, completed_visit_count, lifetime_points_earned, last_earned_at" as never)
    .eq("tenant_id" as never, tenant.id)
    .eq("customer_id" as never, session.customerId)
    .single();

  const loyalty = loyaltyRow as unknown as {
    points_balance: number;
    completed_visit_count: number;
    lifetime_points_earned: number;
    last_earned_at: string | null;
  } | null;

  // Load available rewards
  const { data: rewardRows } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("loyalty_rewards" as never)
    .select("id, name, description, reward_type, points_required, visits_required, sort_order" as never)
    .eq("tenant_id" as never, tenant.id)
    .eq("is_active" as never, true)
    .order("sort_order" as never, { ascending: true });

  const rewards = (rewardRows ?? []) as unknown as Array<{
    id: string;
    name: string;
    description: string | null;
    reward_type: string;
    points_required: number | null;
    visits_required: number | null;
  }>;

  // Load active packages
  const { data: pkgRows } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("customer_packages" as never)
    .select("id, credits_remaining, credits_total, expires_at, status, package_id" as never)
    .eq("tenant_id" as never, tenant.id)
    .eq("customer_id" as never, session.customerId)
    .eq("status" as never, "active");

  const packages = (pkgRows ?? []) as unknown as Array<{
    id: string;
    credits_remaining: number;
    credits_total: number;
    expires_at: string | null;
    status: string;
  }>;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", py: 3, px: { xs: 1.5, sm: 2 } }}>
      <Box sx={{ maxWidth: 600, mx: "auto" }}>
        {/* Header */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={700}>{tenant.name}</Typography>
              <Typography variant="body2" color="text.secondary">Rewards & Packages</Typography>
            </Box>
            <Button
              component="a"
              href={`/book/${tenantSlug}/portal`}
              variant="outlined"
              size="small"
            >
              Back to Portal
            </Button>
          </Stack>
        </Paper>

        {/* Loyalty Summary */}
        {loyalty ? (
          <Paper elevation={1} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Loyalty</Typography>
            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="h4" fontWeight={700} color="primary">{loyalty.points_balance}</Typography>
                <Typography variant="caption" color="text.secondary">Points Balance</Typography>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} color="primary">{loyalty.completed_visit_count}</Typography>
                <Typography variant="caption" color="text.secondary">Visits</Typography>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>{loyalty.lifetime_points_earned}</Typography>
                <Typography variant="caption" color="text.secondary">Lifetime Points</Typography>
              </Box>
            </Stack>
            {loyalty.last_earned_at && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Last earned: {new Date(loyalty.last_earned_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Typography>
            )}
          </Paper>
        ) : (
          <Paper elevation={1} sx={{ p: 3, borderRadius: 3, mb: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">No loyalty account yet. Complete an appointment to start earning!</Typography>
          </Paper>
        )}

        {/* Available Rewards */}
        {rewards.length > 0 && (
          <Paper elevation={1} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Available Rewards</Typography>
            <Stack spacing={1.5}>
              {rewards.map((reward) => (
                <Paper key={reward.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>{reward.name}</Typography>
                      {reward.description && (
                        <Typography variant="caption" color="text.secondary">{reward.description}</Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      {reward.points_required !== null && (
                        <Typography variant="body2" color="primary" fontWeight={600}>{reward.points_required} pts</Typography>
                      )}
                      {reward.visits_required !== null && (
                        <Typography variant="body2" color="primary" fontWeight={600}>{reward.visits_required} visits</Typography>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Packages */}
        {packages.length > 0 && (
          <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Active Packages</Typography>
            <Stack spacing={1.5}>
              {packages.map((pkg) => {
                const progress = pkg.credits_total > 0 ? (pkg.credits_remaining / pkg.credits_total) * 100 : 0;
                return (
                  <Paper key={pkg.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                      <Typography variant="subtitle2" fontWeight={600}>Service Package</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {pkg.credits_remaining}/{pkg.credits_total} credits
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
                    {pkg.expires_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                        Expires {new Date(pkg.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Paper>
        )}

        {/* Empty state when nothing */}
        {!loyalty && rewards.length === 0 && packages.length === 0 && (
          <Paper elevation={1} sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
            <CardGiftcardIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No rewards or packages available yet</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
