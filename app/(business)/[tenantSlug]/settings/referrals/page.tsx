import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";

/**
 * Referral Settings — Milestone 15.4.
 */
export default async function ReferralSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const supabase = createServiceRoleClient();
  const { data: program } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .from("tenant_referral_programs" as never)
    .select("*" as never)
    .eq("tenant_id" as never, tenant.id)
    .maybeSingle();

  const p = (program ?? {}) as Record<string, unknown>;

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Referral Program"
        description="Configure customer referral rewards and incentives."
        breadcrumbs={[
          { label: "Settings", href: `/${tenantSlug}/settings` },
          { label: "Referrals" },
        ]}
      />

      <SectionCard title="Program Status">
        <Typography sx={{ fontSize: "0.875rem" }}>
          Referral program: <strong>{p.enabled ? "Enabled" : "Disabled"}</strong>
        </Typography>
      </SectionCard>

      <SectionCard title="Referrer Reward">
        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: "0.8125rem" }}>
            Type: {String(p.referrer_reward_type ?? "loyalty_points")}
          </Typography>
          <Typography sx={{ fontSize: "0.8125rem" }}>
            Value: {String(p.referrer_reward_value ?? 0)}
          </Typography>
        </Stack>
      </SectionCard>

      <SectionCard title="New Customer Incentive">
        <Typography sx={{ fontSize: "0.8125rem" }}>
          {p.referred_incentive_type
            ? `${String(p.referred_incentive_type)}: ${String(p.referred_incentive_value ?? 0)}`
            : "No incentive configured"}
        </Typography>
      </SectionCard>

      <SectionCard title="Qualification & Attribution">
        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: "0.8125rem" }}>
            Rule: {String(p.qualification_rule ?? "first_completed_appointment")}
          </Typography>
          <Typography sx={{ fontSize: "0.8125rem" }}>
            Attribution window: {String(p.attribution_window_days ?? 30)} days
          </Typography>
        </Stack>
      </SectionCard>
    </Stack>
  );
}
