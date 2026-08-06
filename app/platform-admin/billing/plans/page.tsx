import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";

export default async function PlatformAdminBillingPlansAliasPage() {
     await requirePlatformAdmin();
     redirect("/platform/billing/plans");
}
