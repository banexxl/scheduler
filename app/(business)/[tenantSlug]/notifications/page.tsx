import Stack from "@mui/material/Stack";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getOperationalNotifications } from "@/features/notifications/services/get-operational-notifications";
import { getMyStaffResourceId } from "@/features/staff/services/staff-queries";
import type { NotificationCategory } from "@/features/notifications/types/operational-notification";
import PageHeader from "@/features/platform/components/page-header";
import NotificationsClientPage from "./client-page";

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  const resourceId = await getMyStaffResourceId(tenant.id, membership.id);

  const category = query.category as NotificationCategory | undefined;
  const filter = query.filter;

  const data = await getOperationalNotifications(
    tenant.id,
    membership.id,
    membership.role,
    resourceId,
    {
      category: category ?? null,
      unreadOnly: filter === "unread",
      unresolvedOnly: filter === "attention",
    },
    25,
    0
  );

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Notifications"
        description={`${data.unreadCount} unread`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Notifications" },
        ]}
      />

      <NotificationsClientPage
        tenantSlug={tenantSlug}
        data={data}
        activeFilter={filter ?? "all"}
        activeCategory={category ?? null}
      />
    </Stack>
  );
}
