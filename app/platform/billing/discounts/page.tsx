import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPolarDiscounts } from "@/features/platform/services/polar-client";
import PageHeader from "@/features/platform/components/page-header";

/**
 * Platform Billing Discounts Page — Milestone 15.13.
 *
 * Shows all Polar discounts with their sync status to local tenant_discounts.
 * Platform admin can view, create, and manage discounts across all tenants.
 */
export default async function PlatformBillingDiscountsPage() {
  await requirePlatformAdmin();
  const supabase = createAdminClient();

  // Load Polar discounts
  let polarDiscounts: Array<Record<string, unknown>> = [];
  let polarError: string | null = null;
  try {
    polarDiscounts = await listPolarDiscounts();
  } catch (error) {
    polarError = error instanceof Error ? error.message : "Unable to load Polar discounts";
  }

  // Load local discount sync mappings
  const { data: mappings } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_provider_resources" as never)
    .select("provider_resource_id, tenant_id, local_resource_id, sync_status, tenants(name, slug)" as never)
    .eq("resource_type" as never, "discount")
    .order("created_at" as never, { ascending: false })
    .limit(100);

  const mappingsByPolarId = new Map(
    ((mappings ?? []) as unknown as Array<{
      provider_resource_id: string;
      tenant_id: string;
      local_resource_id: string;
      sync_status: string;
      tenants: { name: string; slug: string } | null;
    }>).map(m => [m.provider_resource_id, m])
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Discounts"
        description="Polar discounts synced across tenants. Discounts created here apply to subscription plans."
      />

      {polarError && (
        <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fff3f3" }}>
          <Typography color="error" variant="body2">{polarError}</Typography>
        </Paper>
      )}

      {/* Polar Discounts Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Tenant</TableCell>
              <TableCell>Sync Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {polarDiscounts.length === 0 && !polarError && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No discounts found in Polar. Create one in the Polar dashboard.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {polarDiscounts.map((discount) => {
              const id = String(discount.id ?? "");
              const mapping = mappingsByPolarId.get(id);
              const discountType = String(discount.type ?? "");
              const value = discountType === "percentage"
                ? `${((discount.basis_points as number) ?? 0) / 100}%`
                : `${discount.amount ?? 0} ${String(discount.currency ?? "").toUpperCase()}`;

              return (
                <TableRow key={id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {String(discount.name ?? "Untitled")}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {discount.code ? (
                      <Chip label={String(discount.code)} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.disabled">No code</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={discountType}
                      size="small"
                      color={discountType === "percentage" ? "primary" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{value}</TableCell>
                  <TableCell>
                    {mapping?.tenants ? (
                      <Typography variant="body2">{mapping.tenants.name}</Typography>
                    ) : (
                      <Typography variant="caption" color="text.disabled">Platform-wide</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {mapping ? (
                      <Chip
                        label={mapping.sync_status}
                        size="small"
                        color={mapping.sync_status === "synced" ? "success" : mapping.sync_status === "failed" ? "error" : "default"}
                        variant="outlined"
                      />
                    ) : (
                      <Chip label="not synced" size="small" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Quick actions */}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          href="https://sandbox.polar.sh/dashboard/get-slot/products/discounts"
          target="_blank"
          rel="noopener noreferrer"
        >
          Manage in Polar
        </Button>
      </Box>
    </Stack>
  );
}
