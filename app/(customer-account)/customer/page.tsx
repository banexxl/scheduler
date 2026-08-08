import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getOrCreateCustomerAccount, getLinkedBusinesses } from "@/features/customer-account/services/customer-account-queries";
import { getCustomerDashboardSummary } from "@/features/customer-account/services/unified-dashboard-queries";
import CustomerDashboardClient from "./client-page";

/**
 * Customer Dashboard — Milestone 9.2.
 *
 * Shows unified view across all linked businesses.
 */
export default async function CustomerDashboardPage() {
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

  const [summary, businesses] = await Promise.all([
    getCustomerDashboardSummary(account.id),
    getLinkedBusinesses(account.id),
  ]);

  return (
    <CustomerDashboardClient
      accountName={account.fullName}
      summary={summary}
      businesses={businesses}
    />
  );
}
