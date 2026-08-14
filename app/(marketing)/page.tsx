import MarketingLandingPage from "@/features/marketing/components/landing-page";

export const metadata = {
  title: "Get Slot — Online Scheduling for Modern Businesses",
  description: "Powerful appointment scheduling platform. Manage bookings, payments, gift cards, packages, and recurring appointments — all in one place.",
  openGraph: {
    title: "Get Slot — Online Scheduling for Modern Businesses",
    description: "Powerful appointment scheduling platform for salons, clinics, studios, and service businesses.",
    type: "website",
  },
};

export default function MarketingHomePage() {
  return <MarketingLandingPage />;
}
