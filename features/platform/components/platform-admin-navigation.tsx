"use client";

import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

type NavItem = {
     href: string;
     label: string;
};

const NAV_ITEMS: NavItem[] = [
     { href: "/platform", label: "Dashboard" },
     { href: "/platform/billing", label: "Billing" },
     { href: "/platform/billing/plans", label: "Billing Plans" },
     { href: "/platform/billing/products", label: "Polar Products" },
     { href: "/platform/billing/subscriptions", label: "Subscriptions" },
     { href: "/platform/billing/webhooks", label: "Webhooks" },
     { href: "/platform/tenants", label: "Tenants" },
];

export default function PlatformAdminNavigation() {
     const router = useRouter();

     return (
          <Stack
               direction={{ xs: "column", md: "row" }}
               spacing={1}
               sx={{ mb: 3 }}
               aria-label="Platform admin navigation"
          >
               {NAV_ITEMS.map((item) => (
                    <Button
                         key={item.href}
                         onClick={() => router.push(item.href)}
                         variant="outlined"
                         size="small"
                    >
                         {item.label}
                    </Button>
               ))}
          </Stack>
     );
}
