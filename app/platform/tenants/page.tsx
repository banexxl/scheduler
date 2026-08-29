import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import PageHeader from "@/features/platform/components/page-header";
import SectionCard from "@/features/platform/components/section-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import StatusChip from "@/components/ui/status-chip";
import { listPlatformTenants } from "@/features/platform/services/platform-tenant-queries";

const PAGE_SIZE = 25;

function formatDate(iso: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.split("T")[0] ?? "-";
  }
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(Number(params.page ?? "1"), 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { tenants, total } = await listPlatformTenants({
    search: params.search,
    status: params.status,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Tenants"
        description={`${total} registered business${total !== 1 ? "es" : ""}`}
        breadcrumbs={[
          { label: "Platform", href: "/platform" },
          { label: "Tenants" },
        ]}
      />

      {/* Filters */}
      <SectionCard noPadding>
        <Box sx={{ p: 2, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
          <form method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 200 }}>
            <TextField
              name="search"
              placeholder="Search tenants..."
              defaultValue={params.search ?? ""}
              size="small"
              sx={{ flex: 1, minWidth: 180, maxWidth: 320 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "#5c5c72" }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="outlined" size="small">
              Search
            </Button>
          </form>

          <Stack direction="row" spacing={0.5}>
            {["active", "trialing", "suspended", "cancelled"].map((s) => (
              <Chip
                key={s}
                label={s}
                component="a"
                href={`/platform/tenants?status=${s}${params.search ? `&search=${params.search}` : ""}`}
                clickable
                size="small"
                variant={params.status === s ? "filled" : "outlined"}
                color={params.status === s ? "primary" : "default"}
              />
            ))}
            {params.status && (
              <Chip
                label="Clear"
                component="a"
                href={`/platform/tenants${params.search ? `?search=${params.search}` : ""}`}
                clickable
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>
      </SectionCard>

      {/* Table */}
      <SectionCard noPadding>
        {tenants.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <PlatformEmptyState
              title="No tenants found"
              description={params.search || params.status ? "Try adjusting your search or filters." : "No tenants have been registered yet."}
            />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#8b8b9e" }}>Business</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#8b8b9e" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#8b8b9e" }}>Subscription</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#8b8b9e" }}>Members</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#8b8b9e" }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#8b8b9e" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow
                      key={tenant.id}
                      hover
                      sx={{ "&:last-child td": { border: 0 } }}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                          {tenant.name}
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: "#5c5c72" }}>
                          /{tenant.slug}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip label={tenant.status} size="small" />
                      </TableCell>
                      <TableCell>
                        {tenant.subscriptionStatus ? (
                          <StatusChip label={tenant.subscriptionStatus} size="small" />
                        ) : (
                          <Typography sx={{ fontSize: "0.75rem", color: "#5c5c72" }}>
                            None
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: "0.8125rem" }}>
                          {tenant.memberCount}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: "0.75rem", color: "#8b8b9e" }}>
                          {formatDate(tenant.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          component="a"
                          href={`/platform/tenants/${tenant.id}`}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <Typography sx={{ fontSize: "0.75rem", color: "#8b8b9e" }}>
                  Page {page} of {totalPages} ({total} total)
                </Typography>
                <Stack direction="row" spacing={1}>
                  {page > 1 && (
                    <Button
                      component="a"
                      href={`/platform/tenants?page=${page - 1}${params.search ? `&search=${params.search}` : ""}${params.status ? `&status=${params.status}` : ""}`}
                      size="small"
                      variant="outlined"
                    >
                      Previous
                    </Button>
                  )}
                  {page < totalPages && (
                    <Button
                      component="a"
                      href={`/platform/tenants?page=${page + 1}${params.search ? `&search=${params.search}` : ""}${params.status ? `&status=${params.status}` : ""}`}
                      size="small"
                      variant="outlined"
                    >
                      Next
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
          </>
        )}
      </SectionCard>
    </Stack>
  );
}
