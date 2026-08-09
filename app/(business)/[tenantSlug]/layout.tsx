import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import BusinessShell from "@/features/business/components/business-shell";

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
      <BusinessShell
        tenantName={tenant.name}
        tenantSlug={tenantSlug}
        userEmail={user.email ?? ""}
        role={membership.role}
      />
      <Container
        component="main"
        maxWidth="xl"
        sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 } }}
      >
        {children}
      </Container>
    </Box>
  );
}
