"use client";

/**
 * Tenant Business Sidebar — Milestone 14.2.
 *
 * Desktop: persistent left sidebar with grouped navigation.
 * Mobile: temporary drawer.
 * Light theme, warm professional aesthetic.
 */

import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TodayIcon from "@mui/icons-material/Today";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PeopleIcon from "@mui/icons-material/People";
import BadgeIcon from "@mui/icons-material/Badge";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import DevicesIcon from "@mui/icons-material/Devices";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import StarIcon from "@mui/icons-material/Star";
import ListAltIcon from "@mui/icons-material/ListAlt";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import PaymentIcon from "@mui/icons-material/Payment";
import NotificationsIcon from "@mui/icons-material/Notifications";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import GroupIcon from "@mui/icons-material/Group";
import SettingsIcon from "@mui/icons-material/Settings";
import CampaignIcon from "@mui/icons-material/Campaign";
import {
  TENANT_SIDEBAR_WIDTH,
  tenantPalette,
  tenantTypography,
  tenantSurface,
} from "@/styles/theme/tenant-tokens";

// ─── Navigation Definition ───────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  matchPrefix?: string;
  roles?: string[]; // if specified, only show for these roles
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function getNavGroups(slug: string): NavGroup[] {
  return [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: `/${slug}/dashboard`, icon: <DashboardIcon fontSize="small" /> },
        { label: "My Day", href: `/${slug}/my-day`, icon: <TodayIcon fontSize="small" /> },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Calendar", href: `/${slug}/calendar`, icon: <CalendarMonthIcon fontSize="small" />, matchPrefix: `/${slug}/calendar` },
        { label: "Appointments", href: `/${slug}/appointments`, icon: <EventNoteIcon fontSize="small" />, matchPrefix: `/${slug}/appointments` },
        { label: "Customers", href: `/${slug}/customers`, icon: <PeopleIcon fontSize="small" />, matchPrefix: `/${slug}/customers` },
      ],
    },
    {
      label: "Business",
      items: [
        { label: "Staff", href: `/${slug}/staff`, icon: <BadgeIcon fontSize="small" />, matchPrefix: `/${slug}/staff` },
        { label: "Services", href: `/${slug}/services`, icon: <ContentCutIcon fontSize="small" />, matchPrefix: `/${slug}/services` },
        { label: "Resources", href: `/${slug}/resources`, icon: <DevicesIcon fontSize="small" />, matchPrefix: `/${slug}/resources` },
        { label: "Locations", href: `/${slug}/locations`, icon: <LocationOnIcon fontSize="small" />, matchPrefix: `/${slug}/locations` },
      ],
    },
    {
      label: "Engagement",
      items: [
        { label: "Campaigns", href: `/${slug}/campaigns`, icon: <CampaignIcon fontSize="small" />, matchPrefix: `/${slug}/campaigns` },
        { label: "Reviews", href: `/${slug}/reviews`, icon: <StarIcon fontSize="small" />, matchPrefix: `/${slug}/reviews` },
        { label: "Waitlist", href: `/${slug}/waitlist`, icon: <ListAltIcon fontSize="small" />, matchPrefix: `/${slug}/waitlist` },
        { label: "Packages", href: `/${slug}/packages`, icon: <CardGiftcardIcon fontSize="small" />, matchPrefix: `/${slug}/packages` },
        { label: "Referrals", href: `/${slug}/referrals`, icon: <StarIcon fontSize="small" />, matchPrefix: `/${slug}/referrals` },
      ],
    },
    {
      label: "Finance",
      items: [
        { label: "Payments", href: `/${slug}/payments`, icon: <PaymentIcon fontSize="small" />, matchPrefix: `/${slug}/payments` },
        { label: "Gift Cards", href: `/${slug}/gift-cards`, icon: <CardGiftcardIcon fontSize="small" />, matchPrefix: `/${slug}/gift-cards` },
      ],
    },
    {
      label: "Manage",
      items: [
        { label: "Notifications", href: `/${slug}/notifications`, icon: <NotificationsIcon fontSize="small" />, matchPrefix: `/${slug}/notifications` },
        { label: "Health", href: `/${slug}/health`, icon: <HealthAndSafetyIcon fontSize="small" />, matchPrefix: `/${slug}/health` },
        { label: "Team", href: `/${slug}/team`, icon: <GroupIcon fontSize="small" />, matchPrefix: `/${slug}/team` },
        { label: "Settings", href: `/${slug}/settings`, icon: <SettingsIcon fontSize="small" />, matchPrefix: `/${slug}/settings` },
      ],
    },
  ];
}

// ─── Sidebar Content ─────────────────────────────────────────────────────────

function SidebarContent({
  tenantName,
  tenantSlug,
  role,
  onClose,
}: {
  tenantName: string;
  tenantSlug: string;
  role: string;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const navGroups = getNavGroups(tenantSlug);

  function isActive(item: NavItem): boolean {
    const dashboardHref = `/${tenantSlug}/dashboard`;
    if (item.href === dashboardHref) {
      return pathname === dashboardHref || pathname === `/${tenantSlug}`;
    }
    if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
    return pathname === item.href;
  }

  return (
    <Box
      sx={{
        width: TENANT_SIDEBAR_WIDTH,
        height: "100%",
        bgcolor: tenantPalette.sidebar.bg,
        borderRight: tenantSurface.border,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Tenant Identity */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: tenantSurface.border, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: "0.8rem",
            fontWeight: 700,
            bgcolor: tenantPalette.accent.primaryLight,
            color: tenantPalette.accent.primary,
          }}
        >
          {tenantName.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#111827",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tenantName}
          </Typography>
          <Typography sx={{ fontSize: "0.6875rem", color: tenantPalette.sidebar.groupLabel, textTransform: "capitalize" }}>
            {role}
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: "auto", py: 0.5 }}>
        {navGroups.map((group, idx) => (
          <Box key={group.label}>
            {idx > 0 && <Divider sx={{ my: 0.5, borderColor: tenantPalette.sidebar.border }} />}
            <Typography
              sx={{
                ...tenantTypography.navGroup,
                color: tenantPalette.sidebar.groupLabel,
                px: 2,
                pt: 1.5,
                pb: 0.5,
              }}
            >
              {group.label}
            </Typography>
            <List dense disablePadding>
              {group.items
                .filter((item) => !item.roles || item.roles.includes(role))
                .map((item) => {
                  const active = isActive(item);
                  return (
                    <ListItem key={item.href} disablePadding sx={{ px: 0.75 }}>
                      <ListItemButton
                        component="a"
                        href={item.href}
                        onClick={onClose}
                        selected={active}
                        sx={{
                          borderRadius: 1.5,
                          py: 0.6,
                          px: 1.5,
                          minHeight: 34,
                          bgcolor: active ? tenantPalette.sidebar.bgActive : "transparent",
                          "&:hover": {
                            bgcolor: active ? tenantPalette.sidebar.bgActive : tenantPalette.sidebar.bgHover,
                          },
                          "&.Mui-selected": {
                            bgcolor: tenantPalette.sidebar.bgActive,
                            "&:hover": { bgcolor: tenantPalette.sidebar.bgActive },
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 28,
                            color: active ? tenantPalette.sidebar.iconActive : tenantPalette.sidebar.iconDefault,
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            sx: {
                              ...tenantTypography.navItem,
                              color: active ? tenantPalette.sidebar.textActive : tenantPalette.sidebar.text,
                              fontWeight: active ? 600 : 500,
                            },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Exported Component ──────────────────────────────────────────────────────

type TenantSidebarProps = {
  tenantName: string;
  tenantSlug: string;
  role: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export default function TenantSidebar({
  tenantName,
  tenantSlug,
  role,
  mobileOpen,
  onMobileClose,
}: TenantSidebarProps) {
  return (
    <>
      {/* Desktop persistent sidebar */}
      <Box
        component="nav"
        aria-label="Business navigation"
        sx={{
          width: TENANT_SIDEBAR_WIDTH,
          flexShrink: 0,
          display: { xs: "none", md: "block" },
        }}
      >
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: TENANT_SIDEBAR_WIDTH,
            height: "100vh",
            zIndex: 1200,
          }}
        >
          <SidebarContent tenantName={tenantName} tenantSlug={tenantSlug} role={role} />
        </Box>
      </Box>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: TENANT_SIDEBAR_WIDTH, border: "none" },
        }}
      >
        <SidebarContent tenantName={tenantName} tenantSlug={tenantSlug} role={role} onClose={onMobileClose} />
      </Drawer>
    </>
  );
}
