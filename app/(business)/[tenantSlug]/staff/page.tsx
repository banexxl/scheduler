import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import StatusChip from "@/components/ui/status-chip";

/**
 * Staff Page — Milestone 15.4.
 *
 * Shows bookable staff profiles (distinct from team membership).
 */
export default async function StaffPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canManage = ["owner", "admin"].includes(membership.role);

  const supabase = createServiceRoleClient();

  const { data: profiles } = await supabase
    .from("staff_profiles")
    .select("id, display_name, job_title, resource_id, is_active, created_at")
    .eq("tenant_id", tenant.id)
    .order("display_name", { ascending: true });

  const rows = (profiles ?? []) as Array<Record<string, unknown>>;

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Staff"
        description={`${rows.length} staff profile${rows.length !== 1 ? "s" : ""} — bookable people linked to resources`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Staff" },
        ]}
        action={
          canManage ? (
            <Button href={`/${tenantSlug}/team`} variant="outlined" size="small">
              Manage Team
            </Button>
          ) : undefined
        }
      />

      <SectionCard noPadding>
        {rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <PlatformEmptyState
              title="No staff profiles"
              description="Link team members to resources to create bookable staff profiles."
            />
          </Box>
        ) : (
          <Stack spacing={0}>
            {rows.map((profile) => (
              <Box
                key={String(profile.id)}
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderBottom: "1px solid #f0f0f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
                    {String(profile.display_name ?? "Unnamed")}
                  </Typography>
                  {profile.job_title ? (
                    <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {String(profile.job_title)}
                    </Typography>
                  ) : null}
                </Box>
                <StatusChip
                  label={profile.is_active ? "Active" : "Inactive"}
                  color={profile.is_active ? "success" : "default"}
                  size="small"
                />
              </Box>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}
