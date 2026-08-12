import { redirect } from "next/navigation";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { requireUser } from "@/lib/auth/require-user";
import { getOrCreateCustomerAccount, getLinkedBusinesses } from "@/features/customer-account/services/customer-account-queries";
import {
  customerPalette,
  customerTypography,
} from "@/styles/theme/customer-tokens";

/**
 * Customer Account — Milestone 14.3.
 *
 * Profile, linked businesses, and account management.
 */
export default async function CustomerAccountPage() {
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
    <Stack spacing={3}>
      <Typography sx={customerTypography.pageTitle}>Account</Typography>

      {/* Profile */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: `${customerPalette.card.radius}px`,
          bgcolor: customerPalette.page.surface,
          border: `1px solid ${customerPalette.card.border}`,
        }}
      >
        <Typography sx={customerTypography.sectionTitle}>Profile</Typography>
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          <Box>
            <Typography sx={customerTypography.caption}>Name</Typography>
            <Typography sx={customerTypography.body}>{account.fullName ?? "Not set"}</Typography>
          </Box>
          <Box>
            <Typography sx={customerTypography.caption}>Email</Typography>
            <Typography sx={customerTypography.body}>{user.email ?? "—"}</Typography>
          </Box>
        </Stack>
      </Box>

      {/* Connected businesses */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: `${customerPalette.card.radius}px`,
          bgcolor: customerPalette.page.surface,
          border: `1px solid ${customerPalette.card.border}`,
        }}
      >
        <Typography sx={customerTypography.sectionTitle}>Connected Businesses</Typography>
        {businesses.length === 0 ? (
          <Typography sx={{ ...customerTypography.meta, mt: 1 }}>
            No businesses linked to your account yet.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mt: 1.5 }}>
            {businesses.map((b) => (
              <Stack key={b.tenantId} direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography sx={customerTypography.body}>{b.tenantName}</Typography>
                  <Typography sx={customerTypography.caption}>
                    Since {new Date(b.linkedAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Button
                  href={`/book/${b.tenantSlug}`}
                  size="small"
                  variant="text"
                  sx={{ textTransform: "none", fontSize: "0.8125rem" }}
                >
                  Book
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      {/* Links */}
      <Stack spacing={1}>
        <Button href="/customer/payments" variant="outlined" size="small" sx={{ textTransform: "none", justifyContent: "flex-start" }}>
          Payment History
        </Button>
        <Button href="/customer/communications" variant="outlined" size="small" sx={{ textTransform: "none", justifyContent: "flex-start" }}>
          Communication Preferences
        </Button>
      </Stack>
    </Stack>
  );
}
