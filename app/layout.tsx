import type { Metadata } from "next";
import ThemeRegistry from "@/components/layout/ThemeRegistry";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Scheduler Platform",
  description: "SaaS Scheduling Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
