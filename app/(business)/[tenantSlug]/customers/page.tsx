import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getCustomersList, getCustomerStatusLabel } from "@/features/customers/services/customer-queries";

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
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Customers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Track customer profiles, recent visits, and booking activity in one tenant-scoped CRM view.
          </Typography>
        </Box>
        <Button component="a" href={`/${tenantSlug}/appointments/new`} variant="outlined">
          New Appointment
        </Button>
      </Box>

      <Box component="form" method="get" action={`/${tenantSlug}/customers`} sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
        <TextField name="q" label="Search by name, email, or phone" defaultValue={query.q ?? ""} size="small" sx={{ minWidth: 280 }} />
        <TextField
          select
          SelectProps={{ native: true }}
          name="status"
          label="Status"
          defaultValue={query.status ?? ""}
          size="small"
          sx={{ minWidth: 180 }}
        >
          <option value="">All customers</option>
          <option value="upcoming">Upcoming</option>
          <option value="blocked">Blocked</option>
          <option value="active">Active</option>
        </TextField>
        <Button type="submit" variant="contained">Filter</Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Showing {total} customer{total === 1 ? "" : "s"} in this tenant.
      </Alert>

      {items.length === 0 ? (
        <Alert severity="info">No customers match the current filters yet.</Alert>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((customer) => (
                <TableRow key={customer.id} hover>
                  <TableCell>
                    <Link href={`/${tenantSlug}/customers/${customer.id}`} underline="hover" sx={{ fontWeight: 600 }}>
                      {customer.name}
                    </Link>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {customer.isBlocked ? "Blocked profile" : customer.hasUpcomingAppointments ? "Upcoming booking" : "Active profile"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{customer.email ?? "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {customer.phoneNumber ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={getCustomerStatusLabel({ isBlocked: customer.isBlocked, hasUpcomingAppointments: customer.hasUpcomingAppointments })} size="small" color={customer.isBlocked ? "error" : customer.hasUpcomingAppointments ? "warning" : "success"} />
                  </TableCell>
                  <TableCell>
                    {customer.tags.length === 0 ? "—" : customer.tags.map((tag) => <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
                  </TableCell>
                  <TableCell>{new Date(customer.updatedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
