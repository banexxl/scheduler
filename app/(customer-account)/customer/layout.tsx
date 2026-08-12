import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getOrCreateCustomerAccount } from "@/features/customer-account/services/customer-account-queries";
import CustomerShell from "@/features/customer-account/components/customer-shell";

/**
 * Customer Account Layout — Milestone 14.3.
 *
 * Wraps all /customer/* pages with the customer shell.
 * Handles auth and loads account identity for the shell.
 */
export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/customer/login");
  }

  const account = await getOrCreateCustomerAccount(
    user.id,
    user.email ?? "",
    user.user_metadata?.full_name as string | undefined
  );

  return (
    <CustomerShell accountName={account.fullName}>
      {children}
    </CustomerShell>
  );
}
