import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { PlatformAdminRow } from "@/lib/platform/get-platform-admin";
import PlatformAdminHeader from "./platform-admin-header";
import PlatformAdminNavigation from "./platform-admin-navigation";

type Props = {
     user: User;
     platformAdmin: PlatformAdminRow;
     children: ReactNode;
};

export default function PlatformAdminShell({
     user,
     platformAdmin,
     children,
}: Props) {
     return (
          <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
               <PlatformAdminHeader user={user} platformAdmin={platformAdmin} />
               <Container maxWidth="xl" sx={{ py: 4 }}>
                    <PlatformAdminNavigation />
                    {children}
               </Container>
          </Box>
     );
}
