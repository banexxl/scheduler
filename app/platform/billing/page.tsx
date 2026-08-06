import Link from "next/link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";

const BILLING_AREAS = [
     {
          title: "Billing Plans",
          description:
               "Create and manage local billing plans, visibility, active state, and order.",
          href: "/platform/billing/plans",
     },
     {
          title: "Polar Products",
          description:
               "Inspect mapped and unmapped Polar products, prices, and run manual synchronization.",
          href: "/platform/billing/products",
     },
     {
          title: "Webhook Diagnostics",
          description:
               "Review billing webhook processing state and retry failed events.",
          href: "/platform/billing/webhooks",
     },
     {
          title: "Subscriptions",
          description:
               "Inspect synchronized subscription lifecycle state for all tenants.",
          href: "/platform/billing/subscriptions",
     },
];

export default async function PlatformBillingHomePage() {
     await requirePlatformAdmin();

     return (
          <Stack spacing={3}>
               <Typography variant="h4" component="h1">
                    Platform Billing
               </Typography>
               <Typography color="text.secondary">
                    Manage the billing catalog and Polar integration from a platform-admin context.
               </Typography>

               <Stack spacing={2}>
                    {BILLING_AREAS.map((area) => (
                         <Paper key={area.href} variant="outlined" sx={{ p: 2 }}>
                              <Stack spacing={1.5}>
                                   <Typography variant="h6">{area.title}</Typography>
                                   <Typography variant="body2" color="text.secondary">
                                        {area.description}
                                   </Typography>
                                   <Button component={Link} href={area.href} variant="outlined" sx={{ width: "fit-content" }}>
                                        Open
                                   </Button>
                              </Stack>
                         </Paper>
                    ))}
               </Stack>
          </Stack>
     );
}
