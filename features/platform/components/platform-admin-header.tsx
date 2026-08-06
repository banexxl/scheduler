import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import type { User } from "@supabase/supabase-js";
import type { PlatformAdminRow } from "@/lib/platform/get-platform-admin";
import { logoutAction } from "@/features/auth/actions/logout";

type Props = {
     user: User;
     platformAdmin: PlatformAdminRow;
};

export default function PlatformAdminHeader({ user, platformAdmin }: Props) {
     return (
          <AppBar position="static" color="primary" elevation={1}>
               <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                         <Typography variant="h6">Scheduler Platform</Typography>
                         <Chip
                              label="Platform administration"
                              size="small"
                              color="secondary"
                              variant="filled"
                         />
                         <Chip label={platformAdmin.role} size="small" color="default" />
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                         <Typography variant="body2">{user.email}</Typography>
                         <form action={logoutAction}>
                              <Button type="submit" variant="outlined" size="small" color="inherit">
                                   Sign Out
                              </Button>
                         </form>
                    </Stack>
               </Toolbar>
          </AppBar>
     );
}
