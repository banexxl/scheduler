import { redirect } from "next/navigation";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { requireUser } from "@/lib/auth/require-user";
import { getOrCreateCustomerAccount, getLinkedBusinesses } from "@/features/customer-account/services/customer-account-queries";
import {
  customerPalette,
  customerTypography,
} from "@/styles/theme/customer-tokens";

/**
 * Customer Rewards — Milestone 14.3.
 *
 * Shows loyalty and packages per linked business.
 * Never aggregates across tenants.
 */
export default async function CustomerRewardsPage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/customer/login");
  }

  const account = await getOrCreateCustomerAccount(
    user.id,
    user.email ?? "",
    user.user_metadata?.full_name as string | undefined
  );

  const businesses = await getLinkedBusinesses(account.id);

  return (
    <Stack spacing={2.5}>
      <Typography sx={customerTypography.pageTitle}>Rewards</Typography>

      {businesses.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography sx={customerTypography.body}>
            No rewards yet.
          </Typography>
          <Typography sx={{ ...customerTypography.meta, mt: 0.5 }}>
            Earn rewards by visiting your linked businesses.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {businesses.map((b) => (
            <Box
              key={b.tenantId}
              sx={{
                p: 2.5,
                borderRadius: `${customerPalette.card.radius}px`,
                bgcolor: customerPalette.page.surface,
                border: `1px solid ${customerPalette.card.border}`,
                boxShadow: customerPalette.card.shadow,
              }}
            >
              <Typography sx={customerTypography.cardTitle}>{b.tenantName}</Typography>
              <Typography sx={{ ...customerTypography.meta, mt: 0.5 }}>
                Loyalty and package rewards from this business will appear here.
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
