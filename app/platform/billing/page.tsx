import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Link from "next/link";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import SectionCard from "@/features/platform/components/section-card";
import { getPlatformBillingDashboardMetrics } from "@/features/platform/services/platform-billing-admin-queries";

export default async function PlatformBillingHomePage() {
     const metrics = await getPlatformBillingDashboardMetrics();

     return (
          <Stack spacing={3}>
               <PageHeader
                    title="Billing"
                    description="Manage the billing catalog, Polar integration, and subscription lifecycle."
                    breadcrumbs={[
                         { label: "Platform", href: "/platform" },
                         { label: "Billing" },
                    ]}
               />

               {/* Health */}
               <SectionCard title="Billing Health">
                    <Grid container spacing={2}>
                         <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                              <MetricCard label="Active Plans" value={metrics.activeBillingPlans} />
                         </Grid>
                         <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                              <MetricCard label="Active Subscriptions" value={metrics.activeSubscriptions} variant="success" />
                         </Grid>
                         <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                              <MetricCard label="Past Due" value={metrics.pastDueSubscriptions} variant={metrics.pastDueSubscriptions > 0 ? "warning" : "default"} />
                         </Grid>
                         <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                              <MetricCard label="Failed Webhooks" value={metrics.failedWebhookEvents} variant={metrics.failedWebhookEvents > 0 ? "error" : "default"} />
                         </Grid>
                    </Grid>
               </SectionCard>

               {/* Sections */}
               <Grid container spacing={2}>
                    {[
                         { title: "Plans", description: "Create and manage billing plans.", href: "/platform/billing/plans" },
                         { title: "Polar Products", description: "Inspect and map Polar products.", href: "/platform/billing/products" },
                         { title: "Subscriptions", description: "Subscription lifecycle and reconciliation.", href: "/platform/billing/subscriptions" },
                         { title: "Orders", description: "Polar order state and financial records.", href: "/platform/billing/orders" },
                         { title: "Refunds", description: "Refund reconciliation state.", href: "/platform/billing/refunds" },
                         { title: "Webhooks", description: "Webhook processing diagnostics.", href: "/platform/billing/webhooks" },
                    ].map((area) => (
                         <Grid key={area.href} size={{ xs: 12, sm: 6, md: 4 }}>
                              <SectionCard
                                   title={area.title}
                                   description={area.description}
                                   action={
                                        <Button component={Link} href={area.href} size="small" variant="text">
                                             Open
                                        </Button>
                                   }
                              >
                                   <div />
                              </SectionCard>
                         </Grid>
                    ))}
               </Grid>
          </Stack>
     );
}
