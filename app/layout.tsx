import type { Metadata } from "next";
import ThemeRegistry from "@/components/layout/ThemeRegistry";
import { Toaster } from "react-hot-toast";
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
      <head>
        <script
          src="https://whop.com/pixel/biz_MLK9EZ6ezy78WA.js"
          defer
        />
      </head>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
