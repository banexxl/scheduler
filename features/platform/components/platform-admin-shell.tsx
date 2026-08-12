import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { PlatformAdminRow } from "@/lib/platform/get-platform-admin";
import PlatformShellClient from "./platform-shell-client";

type Props = {
     user: User;
     platformAdmin: PlatformAdminRow;
     children: ReactNode;
};

/**
 * Platform Admin Shell — Milestone 14.1.
 *
 * Server Component wrapper. Extracts serializable props from
 * auth objects and delegates to the interactive client shell.
 *
 * Never passes functions or non-serializable objects to client.
 */
export default function PlatformAdminShell({
     user,
     platformAdmin,
     children,
}: Props) {
     return (
          <PlatformShellClient
               email={user.email ?? ""}
               role={platformAdmin.role}
          >
               {children}
          </PlatformShellClient>
     );
}
