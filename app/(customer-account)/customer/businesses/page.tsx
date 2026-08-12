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
 * Customer Businesses — Milestone 14.3.
 *
 * Shows all linked businesses with booking CTAs.
 */
export default async function CustomerBusinessesPage() {
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
      <Typography sx={customerTypography.pageTitle}>Your Businesses</Typography>

      {businesses.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography sx={customerTypography.body}>
            No linked businesses yet.
          </Typography>
          <Typography sx={{ ...customerTypography.meta, mt: 0.5 }}>
            Your businesses will appear here after you book an appointment.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
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
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography sx={customerTypography.cardTitle}>{b.tenantName}</Typography>
                  <Typography sx={customerTypography.caption}>
                    Linked {new Date(b.linkedAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Button
                  href={`/book/${b.tenantSlug}`}
                  variant="contained"
                  size="small"
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  Book
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
