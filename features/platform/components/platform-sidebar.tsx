"use client";

/**
 * Platform Admin Sidebar — Milestone 14.1.
 *
 * Desktop: persistent sidebar with navigation groups.
 * Mobile: temporary drawer triggered from top bar.
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import PaymentIcon from "@mui/icons-material/Payment";
import ReceiptIcon from "@mui/icons-material/Receipt";
import WebhookIcon from "@mui/icons-material/Webhook";
import InventoryIcon from "@mui/icons-material/Inventory";
import HistoryIcon from "@mui/icons-material/History";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import {
  SIDEBAR_WIDTH,
  platformPalette,
} from "@/styles/theme/platform-admin-tokens";

// ─── Navigation Items ────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/platform", label: "Dashboard", icon: <DashboardIcon fontSize="small" /> },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/platform/tenants", label: "Tenants", icon: <BusinessIcon fontSize="small" />, matchPrefix: "/platform/tenants" },
      { href: "/platform/users", label: "Users", icon: <PeopleIcon fontSize="small" />, matchPrefix: "/platform/users" },
      { href: "/platform/audit-logs", label: "Audit Logs", icon: <HistoryIcon fontSize="small" />, matchPrefix: "/platform/audit-logs" },
      { href: "/platform/operations", label: "Operations", icon: <DashboardIcon fontSize="small" />, matchPrefix: "/platform/operations" },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/platform/billing", label: "Overview", icon: <PaymentIcon fontSize="small" />, matchPrefix: "/platform/billing" },
      { href: "/platform/billing/plans", label: "Plans", icon: <InventoryIcon fontSize="small" />, matchPrefix: "/platform/billing/plans" },
      { href: "/platform/billing/products", label: "Polar Products", icon: <StorefrontIcon fontSize="small" />, matchPrefix: "/platform/billing/products" },
      { href: "/platform/billing/subscriptions", label: "Subscriptions", icon: <SubscriptionsIcon fontSize="small" />, matchPrefix: "/platform/billing/subscriptions" },
      { href: "/platform/billing/orders", label: "Orders", icon: <ReceiptIcon fontSize="small" />, matchPrefix: "/platform/billing/orders" },
      { href: "/platform/billing/discounts", label: "Discounts", icon: <LocalOfferIcon fontSize="small" />, matchPrefix: "/platform/billing/discounts" },
      { href: "/platform/billing/webhooks", label: "Webhooks", icon: <WebhookIcon fontSize="small" />, matchPrefix: "/platform/billing/webhooks" },
    ],
  },
];

// ─── Sidebar Content ─────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  function isActive(item: NavItem): boolean {
    if (item.href === "/platform") return pathname === "/platform";
    if (item.matchPrefix) {
      // Exact match for items where href equals matchPrefix (e.g., Overview pages)
      if (item.href === item.matchPrefix) return pathname === item.href;
      return pathname.startsWith(item.matchPrefix);
    }
    return pathname === item.href;
  }

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: "100%",
        bgcolor: platformPalette.sidebar.bg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Logo/Identity */}
      <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${platformPalette.sidebar.border}` }}>
        <Typography
          variant="subtitle1"
          sx={{
            color: platformPalette.sidebar.textActive,
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "-0.01em",
          }}
        >
          get-slot
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: platformPalette.sidebar.text, fontSize: "0.7rem" }}
        >
          Platform Admin
        </Typography>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
        {NAV_GROUPS.map((group, groupIdx) => (
          <Box key={group.label}>
            {groupIdx > 0 && (
              <Divider sx={{ borderColor: platformPalette.sidebar.border, my: 0.5 }} />
            )}
            <Typography
              variant="overline"
              sx={{
                px: 2.5,
                py: 1,
                display: "block",
                color: platformPalette.sidebar.text,
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
              }}
            >
              {group.label}
            </Typography>
            <List dense disablePadding>
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <ListItem key={item.href} disablePadding sx={{ px: 1 }}>
                    <Tooltip title={item.label} placement="right" arrow disableHoverListener>
                      <ListItemButton
                        component={Link}
                        href={item.href}
                        onClick={onClose}
                        selected={active}
                        sx={{
                          borderRadius: 1.5,
                          py: 0.75,
                          px: 1.5,
                          minHeight: 36,
                          bgcolor: active ? platformPalette.sidebar.bgActive : "transparent",
                          "&:hover": {
                            bgcolor: active
                              ? platformPalette.sidebar.bgActive
                              : platformPalette.sidebar.bgHover,
                          },
                          "&.Mui-selected": {
                            bgcolor: platformPalette.sidebar.bgActive,
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 32,
                            color: active
                              ? platformPalette.sidebar.accent
                              : platformPalette.sidebar.text,
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: "0.8125rem",
                            fontWeight: active ? 600 : 400,
                            color: active
                              ? platformPalette.sidebar.textActive
                              : platformPalette.sidebar.text,
                          }}
                        />
                      </ListItemButton>
                    </Tooltip>
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

// ─── Exported Sidebar ────────────────────────────────────────────────────────

type PlatformSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export default function PlatformSidebar({ mobileOpen, onMobileClose }: PlatformSidebarProps) {
  return (
    <>
      {/* Desktop: persistent sidebar */}
      <Box
        component="nav"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          display: { xs: "none", md: "block" },
        }}
      >
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: SIDEBAR_WIDTH,
            height: "100vh",
            zIndex: 1200,
          }}
        >
          <SidebarContent />
        </Box>
      </Box>

      {/* Mobile: temporary drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            border: "none",
          },
        }}
      >
        <SidebarContent onClose={onMobileClose} />
      </Drawer>
    </>
  );
}
