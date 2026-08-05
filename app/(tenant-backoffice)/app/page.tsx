import { redirect } from "next/navigation";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getUserTenants } from "@/lib/tenants/get-user-tenants";

export default async function WorkspaceSelectorPage() {
  const user = await requireUser();
  const tenants = await getUserTenants(user);

  // Filter to accessible tenants
  const accessible = tenants.filter((t) => t.tenantStatus === "active");

  // No memberships → redirect to account
  if (accessible.length === 0) {
    redirect("/account");
  }

  // Exactly one → redirect directly
  if (accessible.length === 1) {
    redirect(`/app/${accessible[0]!.tenantSlug}/dashboard`);
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Select Workspace
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose a workspace to continue.
        </Typography>

        <List>
          {accessible.map((membership) => (
            <ListItem key={membership.id} disablePadding>
              <ListItemButton
                component={Link}
                href={`/app/${membership.tenantSlug}/dashboard`}
              >
                <ListItemText
                  primary={membership.tenantName}
                  secondary={`Role: ${membership.role}`}
                />
                <Chip label={membership.role} size="small" variant="outlined" />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Box sx={{ mt: 2, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Signed in as {user.email}
        </Typography>
      </Box>
    </Container>
  );
}
