"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useRouter } from "next/navigation";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/features/notifications/actions/operational-notification-actions";
import type { OperationalNotificationPageDTO, NotificationCategory } from "@/features/notifications/types/operational-notification";

type Props = {
  tenantSlug: string;
  data: OperationalNotificationPageDTO;
  activeFilter: string;
  activeCategory: NotificationCategory | null;
};

const SEVERITY_COLORS: Record<string, "default" | "info" | "warning" | "error"> = {
  info: "default",
  attention: "info",
  warning: "warning",
  critical: "error",
};

export default function NotificationsClientPage({ tenantSlug, data, activeFilter }: Props) {
  const router = useRouter();

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction(tenantSlug);
    router.refresh();
  }

  async function handleMarkRead(id: string) {
    await markNotificationReadAction(tenantSlug, id);
    router.refresh();
  }

  function handleFilterChange(_: unknown, value: string | null) {
    if (!value) return;
    const url = value === "all"
      ? `/${tenantSlug}/notifications`
      : `/${tenantSlug}/notifications?filter=${value}`;
    router.push(url);
  }

  return (
    <Box>
      {/* Filters */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <ToggleButtonGroup value={activeFilter} exclusive onChange={handleFilterChange} size="small">
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="unread">Unread ({data.unreadCount})</ToggleButton>
          <ToggleButton value="attention">Needs attention ({data.unresolvedCount})</ToggleButton>
        </ToggleButtonGroup>

        {data.unreadCount > 0 && (
          <Button size="small" onClick={handleMarkAllRead}>Mark all read</Button>
        )}
      </Stack>

      {/* List */}
      {data.items.length === 0 ? (
        <Alert severity="info">
          {activeFilter === "unread" ? "No unread notifications." : "You're all caught up."}
        </Alert>
      ) : (
        <Stack spacing={1.5}>
          {data.items.map((n) => (
            <Paper
              key={n.id}
              variant="outlined"
              sx={{
                p: 2,
                borderLeft: n.isRead ? undefined : "3px solid",
                borderLeftColor: n.isRead ? undefined : "primary.main",
                opacity: n.isResolved ? 0.7 : 1,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" fontWeight={n.isRead ? 400 : 600}>
                    {n.title}
                  </Typography>
                  {n.message && (
                    <Typography variant="caption" color="text.secondary">{n.message}</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {new Date(n.occurredAt).toLocaleString()}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Chip label={n.severity} size="small" color={SEVERITY_COLORS[n.severity] ?? "default"} />
                  {n.isResolved && <Chip label="Resolved" size="small" variant="outlined" />}
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {!n.isRead && (
                  <Button size="small" onClick={() => handleMarkRead(n.id)}>Mark read</Button>
                )}
                {n.actionUrl && (
                  <Button size="small" component="a" href={n.actionUrl}>View</Button>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
