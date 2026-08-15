import "server-only";

import { redirect } from "next/navigation";
import { getUser } from "./get-user";
import { getCustomerAccountByUserId } from "@/features/customer-account/services/customer-account-queries";
import type { CustomerAccount } from "@/features/customer-account/types/customer-account";
import type { User } from "@supabase/supabase-js";

export type CustomerAccountContext = {
  user: User;
  account: CustomerAccount;
};

/**
 * Requires an authenticated user with a valid customer account.
 *
 * 1. Authenticates via Supabase auth
 * 2. Loads the customer_accounts record for the user
 * 3. Verifies account is active
 * 4. Redirects to /customer/login if unauthenticated
 * 5. Redirects to /customer/login if no account exists
 *
 * This helper ensures that authenticated business users without a
 * customer account cannot access customer-only routes.
 */
export async function requireCustomerAccount(): Promise<CustomerAccountContext> {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const account = await getCustomerAccountByUserId(user.id);

  if (!account || !account.isActive) {
    redirect("/login");
  }

  return { user, account };
}
