import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { logoutAction } from "@/features/auth/actions/logout";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { user, tenant, membership } = await requireTenantMember(tenantSlug);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {tenant.name}
          </Typography>
          <Chip
            label={membership.role}
            size="small"
            variant="outlined"
            sx={{ mr: 2 }}
          />
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user.email}
          </Typography>
          <form action={logoutAction}>
            <Button type="submit" variant="outlined" size="small">
              Sign Out
            </Button>
          </form>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
