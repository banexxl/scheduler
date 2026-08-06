import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";

export default async function PlatformAdminBillingSubscriptionDetailAliasPage({
     params,
}: {
     params: Promise<{ subscriptionId: string }>;
}) {
     await requirePlatformAdmin();
     const { subscriptionId } = await params;
     redirect(`/platform/billing/subscriptions/${subscriptionId}`);
}
