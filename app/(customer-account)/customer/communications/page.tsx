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
 * Customer Communications — Milestone 14.3.
 *
 * Communication history and preferences.
 */
export default async function CustomerCommunicationsPage() {
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
      <Typography sx={customerTypography.pageTitle}>Communications</Typography>

      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography sx={customerTypography.body}>
          No messages yet.
        </Typography>
        <Typography sx={{ ...customerTypography.meta, mt: 0.5 }}>
          Your communication history and preferences will appear here.
        </Typography>
      </Box>
    </Stack>
  );
}
