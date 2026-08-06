import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getCheckoutSessionForReturn } from "@/features/platform/services/tenant-billing-queries";
import { refreshCheckoutStatusAction } from "@/features/platform/actions/tenant-billing-actions";

async function refreshStatusFormAction(formData: FormData) {
     "use server";

     await refreshCheckoutStatusAction(String(formData.get("tenantSlug") ?? ""), {
          checkoutSessionId:
               String(formData.get("checkoutSessionId") ?? "") || undefined,
          requestKey: String(formData.get("requestKey") ?? "") || undefined,
     });
}

function getCheckoutMessage(status: string | null): string {
     switch (status) {
          case "creating":
          case "open":
          case "updated":
               return "Billing confirmation is being synchronized.";
          case "completed":
               return "Checkout was completed. Billing confirmation is being synchronized.";
          case "expired":
               return "Checkout expired. Start a new checkout from the plans page.";
          case "failed":
               return "Checkout failed. Retry from the plans page.";
          default:
               return "Checkout status is unknown. Billing confirmation is being synchronized.";
     }
}

export default async function TenantBillingReturnPage({
     params,
     searchParams,
}: {
     params: Promise<{ tenantSlug: string }>;
     searchParams: Promise<{ checkoutSessionId?: string; requestKey?: string }>;
}) {
     const { tenantSlug } = await params;
     const query = await searchParams;

     const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

     const session = await getCheckoutSessionForReturn({
          tenantId: tenant.id,
          checkoutSessionId: query.checkoutSessionId ?? null,
          requestKey: query.requestKey ?? null,
     });

     const status = session ? String(session.status ?? null) : null;

     return (
          <Stack spacing={3}>
               <Box>
                    <Typography variant="h4" component="h1" gutterBottom>
                         Checkout Return
                    </Typography>
                    <Typography color="text.secondary">
                         Your checkout has been completed or closed.
                    </Typography>
               </Box>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                         <Typography variant="h6">Status</Typography>
                         <Typography>{getCheckoutMessage(status)}</Typography>
                         <Typography variant="body2" color="text.secondary">
                              Current local checkout state: {status ?? "unknown"}
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                              This page does not activate paid access. Subscription activation is synchronized in a later milestone.
                         </Typography>

                         <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                              <form action={refreshStatusFormAction}>
                                   <input type="hidden" name="tenantSlug" value={tenantSlug} />
                                   <input
                                        type="hidden"
                                        name="checkoutSessionId"
                                        value={query.checkoutSessionId ?? ""}
                                   />
                                   <input type="hidden" name="requestKey" value={query.requestKey ?? ""} />
                                   <Button type="submit" variant="outlined">
                                        Refresh Status
                                   </Button>
                              </form>
                              <Button component={Link} href={`/${tenantSlug}/settings/billing`} variant="text">
                                   Return to Billing
                              </Button>
                              <Button component={Link} href={`/${tenantSlug}/settings/billing/plans`} variant="text">
                                   Retry Checkout
                              </Button>
                         </Stack>
                    </Stack>
               </Paper>
          </Stack>
     );
}
