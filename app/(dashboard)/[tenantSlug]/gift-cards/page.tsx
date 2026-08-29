import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import StatusChip from "@/components/ui/status-chip";

/**
 * Gift Card Management — Milestone 15.4.
 */
export default async function GiftCardsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const supabase = createServiceRoleClient();
  const { data: cards } = await supabase
    .from("gift_cards")
    .select("id, code_prefix, currency, initial_amount, current_balance, status, issued_at, expires_at, recipient_name")
    .eq("tenant_id", tenant.id)
    .order("issued_at", { ascending: false })
    .limit(50);

  const rows = (cards ?? []) as Array<Record<string, unknown>>;

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Gift Cards"
        description={`${rows.length} gift card${rows.length !== 1 ? "s" : ""} issued`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Gift Cards" },
        ]}
      />

      <SectionCard noPadding>
        {rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <PlatformEmptyState
              title="No gift cards issued"
              description="Gift cards will appear here after customers purchase them."
            />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Initial</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Balance</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Issued</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((card) => (
                  <TableRow key={String(card.id)} hover>
                    <TableCell sx={{ fontSize: "0.8125rem", fontFamily: "monospace" }}>
                      {String(card.code_prefix)}...
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>
                      {Number(card.initial_amount).toLocaleString()} {String(card.currency)}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                      {Number(card.current_balance).toLocaleString()} {String(card.currency)}
                    </TableCell>
                    <TableCell>
                      <StatusChip label={String(card.status)} size="small" />
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#8b8b9e" }}>
                      {new Date(String(card.issued_at)).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>
    </Stack>
  );
}
