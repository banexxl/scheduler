import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getCustomersList, getCustomerStatusLabel } from "@/features/customers/services/customer-queries";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import StatusChip from "@/components/ui/status-chip";

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const { tenant } = await requireTenantMember(tenantSlug);

  const filters = {
    search: query.q?.trim() || undefined,
    status: query.status as "active" | "upcoming" | "blocked" | undefined,
  };

  const { items, total } = await getCustomersList(tenant.id, filters);

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Customers"
        description={`${total} customer${total !== 1 ? "s" : ""} in your business`}
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Customers" },
        ]}
        action={
          <Button
            href={`/${tenantSlug}/appointments/new`}
            variant="outlined"
            size="small"
          >
            New Appointment
          </Button>
        }
      />

      {/* Search and Filters */}
      <SectionCard noPadding>
        <Box
          component="form"
          method="get"
          action={`/${tenantSlug}/customers`}
          sx={{ p: 2, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}
        >
          <TextField
            name="q"
            placeholder="Search by name, email, or phone..."
            defaultValue={query.q ?? ""}
            size="small"
            sx={{ flex: 1, minWidth: 200, maxWidth: 320 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "#9ca3af" }} />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={0.5}>
            {["active", "upcoming", "blocked"].map((s) => (
              <Chip
                key={s}
                label={s}
                component="a"
                href={`/${tenantSlug}/customers?status=${s}${query.q ? `&q=${query.q}` : ""}`}
                clickable
                size="small"
                variant={query.status === s ? "filled" : "outlined"}
                color={query.status === s ? "primary" : "default"}
              />
            ))}
            {(query.status || query.q) && (
              <Chip
                label="Clear"
                component="a"
                href={`/${tenantSlug}/customers`}
                clickable
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
          <Button type="submit" variant="outlined" size="small">
            Search
          </Button>
        </Box>
      </SectionCard>

      {/* Customer Table */}
      <SectionCard noPadding>
        {items.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <PlatformEmptyState
              title="No customers found"
              description={filters.search || filters.status
                ? "Try adjusting your search or filters."
                : "Customers will appear here after their first booking."}
            />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#6b7280" }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#6b7280" }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#6b7280" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#6b7280" }}>Tags</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#6b7280" }}>Updated</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#6b7280" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((customer) => (
                  <TableRow key={customer.id} hover sx={{ "&:last-child td": { border: 0 } }}>
                    <TableCell>
                      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                        {customer.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: "0.8125rem" }}>
                        {customer.email ?? "—"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                        {customer.phoneNumber ?? ""}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip
                        label={getCustomerStatusLabel({
                          isBlocked: customer.isBlocked,
                          hasUpcomingAppointments: customer.hasUpcomingAppointments,
                        })}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {customer.tags.length === 0
                        ? <Typography sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>—</Typography>
                        : customer.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, mb: 0.25, fontSize: "0.7rem" }} />
                        ))
                      }
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        {new Date(customer.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        href={`/${tenantSlug}/customers/${customer.id}`}
                        size="small"
                        variant="text"
                        sx={{ fontSize: "0.75rem", minWidth: "auto", textTransform: "none" }}
                      >
                        View
                      </Button>
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
