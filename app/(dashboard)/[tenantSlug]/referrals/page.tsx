import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";

/**
 * Referral Dashboard — Milestone 15.4.
 */
export default async function ReferralDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantMember(tenantSlug);

  const supabase = createServiceRoleClient();

  const { count: attributed } = await supabase
    .from("customer_referrals")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const { count: qualified } = await supabase
    .from("customer_referrals")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .in("status", ["qualified", "rewarded"]);

  const { count: rewarded } = await supabase
    .from("customer_referrals")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .eq("status", "rewarded");

  const total = attributed ?? 0;
  const qual = qualified ?? 0;
  const rew = rewarded ?? 0;
  const rate = total > 0 ? Math.round((qual / total) * 100) : 0;

  const { data: recent } = await supabase
    .from("customer_referrals")
    .select("id, status, attributed_at, referred_customer_email")
    .eq("tenant_id", tenant.id)
    .order("attributed_at", { ascending: false })
    .limit(10);

  const rows = (recent ?? []) as Array<{ id: string; status: string; attributed_at: string; referred_customer_email: string | null }>;

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Referrals"
        description="Customer acquisition through referral program."
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Referrals" },
        ]}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Attributed" value={total} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Qualified" value={qual} variant="success" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Rewarded" value={rew} variant="info" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Conversion" value={`${rate}%`} />
        </Grid>
      </Grid>

      <SectionCard title="Recent Referrals">
        {rows.length === 0 ? (
          <PlatformEmptyState title="No referrals yet" description="Referrals will appear here when customers use referral codes." />
        ) : (
          <Stack spacing={1}>
            {rows.map((r) => (
              <Stack key={r.id} direction="row" justifyContent="space-between" sx={{ fontSize: "0.8125rem" }}>
                <Typography sx={{ fontSize: "0.8125rem" }}>
                  {r.referred_customer_email ?? "Guest"}
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {r.status} — {new Date(r.attributed_at).toLocaleDateString()}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}
