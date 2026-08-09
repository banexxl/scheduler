import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getOperationalNotifications } from "@/features/notifications/services/get-operational-notifications";
import { getMyStaffResourceId } from "@/features/staff/services/staff-queries";
import type { NotificationCategory } from "@/features/notifications/types/operational-notification";
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
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Notifications
      </Typography>
      <NotificationsClientPage
        tenantSlug={tenantSlug}
        data={data}
        activeFilter={filter ?? "all"}
        activeCategory={category ?? null}
      />
    </Box>
  );
}
