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

  // Metrics (tables may not exist in generated types yet — cast as never)
  const { count: attributed } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .from("customer_referrals" as never)
    .select("id" as never, { count: "exact", head: true })
    .eq("tenant_id" as never, tenant.id);

  const { count: qualified } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .from("customer_referrals" as never)
    .select("id" as never, { count: "exact", head: true })
    .eq("tenant_id" as never, tenant.id)
    .in("status" as never, ["qualified", "rewarded"] as never);

  const { count: rewarded } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .from("customer_referrals" as never)
    .select("id" as never, { count: "exact", head: true })
    .eq("tenant_id" as never, tenant.id)
    .eq("status" as never, "rewarded");

  const total = attributed ?? 0;
  const qual = qualified ?? 0;
  const rew = rewarded ?? 0;
  const rate = total > 0 ? Math.round((qual / total) * 100) : 0;

  // Recent referrals
  const { data: recent } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .from("customer_referrals" as never)
    .select("id, status, attributed_at, referred_customer_email" as never)
    .eq("tenant_id" as never, tenant.id)
    .order("attributed_at" as never, { ascending: false })
    .limit(10);

  const rows = ((recent ?? []) as unknown as Array<Record<string, unknown>>);

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
              <Stack key={String(r.id)} direction="row" justifyContent="space-between" sx={{ fontSize: "0.8125rem" }}>
                <Typography sx={{ fontSize: "0.8125rem" }}>
                  {String(r.referred_customer_email ?? "Guest")}
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {String(r.status)} — {new Date(String(r.attributed_at)).toLocaleDateString()}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}
