"use client";

/**
 * Analytics Navigation — Milestone 15.9.1.
 *
 * Shared tab-style navigation for analytics sub-pages.
 * Preserves filter state (period) across page transitions.
 */

import { usePathname, useSearchParams } from "next/navigation";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";

type Props = {
  tenantSlug: string;
};

const TABS = [
  { key: "overview", label: "Overview", path: "" },
  { key: "appointments", label: "Appointments", path: "/appointments" },
  { key: "customers", label: "Customers", path: "/customers" },
  { key: "services", label: "Services", path: "/services" },
  { key: "staff", label: "Staff", path: "/staff" },
  { key: "locations", label: "Locations", path: "/locations" },
  { key: "finance", label: "Finance", path: "/finance" },
  { key: "marketing", label: "Marketing", path: "/marketing" },
];

export default function AnalyticsNav({ tenantSlug }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = searchParams.get("period") ?? "30days";

  const basePath = `/${tenantSlug}/analytics`;

  function isActive(tabPath: string): boolean {
    const fullPath = `${basePath}${tabPath}`;
    if (tabPath === "") return pathname === basePath;
    return pathname.startsWith(fullPath);
  }

  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
      {TABS.map((tab) => (
        <Chip
          key={tab.key}
          label={tab.label}
          component="a"
          href={`${basePath}${tab.path}?period=${period}`}
          clickable
          variant={isActive(tab.path) ? "filled" : "outlined"}
          color={isActive(tab.path) ? "primary" : "default"}
          size="small"
        />
      ))}
    </Stack>
  );
}
