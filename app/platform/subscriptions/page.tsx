import { redirect } from "next/navigation";

export default function SubscriptionsRedirectPage() {
  redirect("/platform/billing/subscriptions");
}
