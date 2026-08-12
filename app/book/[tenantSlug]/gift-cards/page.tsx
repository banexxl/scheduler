import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Public Gift Card Purchase — Milestone 15.4.
 *
 * Displays available gift card denominations for public purchase.
 * Inherits tenant branding via layout (14.4).
 */
export default async function PublicGiftCardsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const supabase = createServiceRoleClient();

  // Check tenant exists and gift cards are enabled
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", tenantSlug)
    .in("status", ["active", "trialing"])
    .single();

  if (!tenant) redirect(`/book/${tenantSlug}`);

  const { data: settings } = await supabase
    .from("tenant_gift_card_settings")
    .select("enabled")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!(settings as { enabled?: boolean } | null)?.enabled) {
    redirect(`/book/${tenantSlug}`);
  }

  // Load active public products
  const { data: products } = await supabase
    .from("gift_card_products")
    .select("id, name, description, amount, currency")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .eq("is_public", true)
    .order("sort_order", { ascending: true });

  const items = (products ?? []) as Array<Record<string, unknown>>;

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", py: 4, px: 2 }}>
      <Stack spacing={3}>
        <Box>
          <Typography sx={{ fontSize: "1.25rem", fontWeight: 700 }}>
            Gift Cards
          </Typography>
          <Typography sx={{ fontSize: "0.875rem", color: "#6b7280", mt: 0.5 }}>
            {tenant.name} — Choose a gift card to purchase.
          </Typography>
        </Box>

        {items.length === 0 ? (
          <Typography sx={{ fontSize: "0.875rem", color: "#6b7280" }}>
            No gift cards currently available.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {items.map((product) => (
              <Box
                key={String(product.id)}
                sx={{
                  p: 2.5,
                  border: "1px solid #e5e7eb",
                  borderRadius: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600 }}>
                    {String(product.name)}
                  </Typography>
                  {product.description ? (
                    <Typography sx={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                      {String(product.description)}
                    </Typography>
                  ) : null}
                </Box>
                <Button variant="contained" size="small" sx={{ textTransform: "none" }}>
                  {(Number(product.amount) / 100).toLocaleString()} {String(product.currency)}
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
