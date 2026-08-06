import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import PlatformAdminShell from "@/features/platform/components/platform-admin-shell";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, platformAdmin } = await requirePlatformAdmin();

  return (
    <PlatformAdminShell user={user} platformAdmin={platformAdmin}>
      {children}
    </PlatformAdminShell>
  );
}
