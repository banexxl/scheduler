import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Get Slot — Online Scheduling Platform",
    template: "%s — Get Slot",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
