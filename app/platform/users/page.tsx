import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";

/**
 * Platform Users — Milestone 14.1.
 * Placeholder operational view. Full user management deferred.
 */
export default async function UsersPage() {
  return (
    <Stack spacing={3}>
      <PageHeader
        title="Users"
        description="Account-level user operations."
        breadcrumbs={[
          { label: "Platform", href: "/platform" },
          { label: "Users" },
        ]}
      />

      <SectionCard title="Auth Users">
        <PlatformEmptyState
          title="User management"
          description="User-level operations are handled through Supabase Auth dashboard. This page will provide operational views in a future update."
        />
      </SectionCard>

      <SectionCard title="Platform Admins">
        <Typography sx={{ fontSize: "0.8125rem", color: "#8b8b9e" }}>
          Platform admin accounts are managed via the <code>platform_admins</code> table.
          Changes require direct database access for security.
        </Typography>
      </SectionCard>
    </Stack>
  );
}
