import Link from "next/link";
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
     { href: "/platform/billing/webhooks", label: "Webhooks" },
     { href: "/platform/tenants", label: "Tenants" },
];

export default function PlatformAdminNavigation() {
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
                         component={Link}
                         href={item.href}
                         variant="outlined"
                         size="small"
                    >
                         {item.label}
                    </Button>
               ))}
          </Stack>
     );
}
