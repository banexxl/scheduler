import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import { logoutAction } from "@/features/auth/actions/logout";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, platformAdmin } = await requirePlatformAdmin();

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Platform Administration
          </Typography>
          <Chip
            label={platformAdmin.role}
            size="small"
            color="secondary"
            sx={{ mr: 2 }}
          />
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user.email}
          </Typography>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outlined"
              size="small"
              color="inherit"
            >
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
