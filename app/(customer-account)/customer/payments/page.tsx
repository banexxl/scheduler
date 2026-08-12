import { redirect } from "next/navigation";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { requireUser } from "@/lib/auth/require-user";
import { getOrCreateCustomerAccount } from "@/features/customer-account/services/customer-account-queries";
import {
  customerTypography,
} from "@/styles/theme/customer-tokens";

/**
 * Customer Payments — Milestone 14.3.
 *
 * Shows payment history across linked businesses.
 */
export default async function CustomerPaymentsPage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/customer/login");
  }

  await getOrCreateCustomerAccount(
    user.id,
    user.email ?? "",
    user.user_metadata?.full_name as string | undefined
  );

  return (
    <Stack spacing={2.5}>
      <Typography sx={customerTypography.pageTitle}>Payments</Typography>

      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography sx={customerTypography.body}>
          No payments yet.
        </Typography>
        <Typography sx={{ ...customerTypography.meta, mt: 0.5 }}>
          Your payment history will appear here after completing paid bookings.
        </Typography>
      </Box>
    </Stack>
  );
}
