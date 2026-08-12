import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getOrCreateCustomerAccount } from "@/features/customer-account/services/customer-account-queries";
import { getUnifiedAppointments } from "@/features/customer-account/services/unified-appointment-queries";
import CustomerAppointmentsClient from "./client-page";

/**
 * Customer Appointments — Milestone 14.3.
 *
 * Shows unified appointments across all linked businesses.
 */
export default async function CustomerAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/customer/login");
  }

  const query = await searchParams;
  const filter = (query.filter as "upcoming" | "past" | "cancelled") ?? "upcoming";

  const account = await getOrCreateCustomerAccount(
    user.id,
    user.email ?? "",
    user.user_metadata?.full_name as string | undefined
  );

  const appointments = await getUnifiedAppointments(account.id, filter, 25, 0);

  return (
    <CustomerAppointmentsClient
      appointments={appointments}
      activeFilter={filter}
    />
  );
}
