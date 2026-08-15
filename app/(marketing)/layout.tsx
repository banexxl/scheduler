import type { Metadata } from "next";
import Box from "@mui/material/Box";
import { createClient } from "@/lib/supabase/server";
import MarketingShell from "@/features/marketing/components/marketing-shell";

export const metadata: Metadata = {
  title: {
    default: "Get Slot — Online Scheduling Platform",
    template: "%s — Get Slot",
  },
};

/**
 * Marketing Layout — shared across all marketing/auth/onboarding pages.
 *
 * Features:
 * - Sticky header with logo + auth-aware navigation
 * - Clean background
 * - Footer
 * - Centered content
 */
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check auth state for header (non-blocking — don't redirect)
  let userEmail: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch {
    // Not authenticated — fine
  }

  return (
    <MarketingShell userEmail={userEmail}>
      {children}
    </MarketingShell>
  );
}
