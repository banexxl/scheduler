import LegalPage, { type LegalDocument } from "@/features/marketing/components/legal-page";

export const metadata = {
  title: "Privacy Policy — Get Slot",
  description:
    "How Get Slot collects, uses, shares, and protects your personal information when you use our online scheduling platform.",
  openGraph: {
    title: "Privacy Policy — Get Slot",
    description: "How Get Slot collects, uses, and protects your personal information.",
    type: "website",
  },
};

const EFFECTIVE_DATE = "September 1, 2026";
const SUPPORT_EMAIL = "privacy@getslot.com";

const doc: LegalDocument = {
  eyebrow: "Legal",
  title: "Privacy Policy",
  effectiveDate: EFFECTIVE_DATE,
  intro:
    "This Privacy Policy explains how Get Slot (\u201cGet Slot,\u201d \u201cwe,\u201d \u201cus,\u201d or \u201cour\u201d) collects, uses, discloses, and safeguards your information when you use our online scheduling platform, websites, and related services (collectively, the \u201cServices\u201d). By using the Services, you agree to the practices described here. Please read it carefully, and contact us if you have questions.",
  sections: [
    {
      id: "who-we-are",
      heading: "1. Who We Are and Scope",
      blocks: [
        {
          type: "paragraph",
          text: "Get Slot provides appointment scheduling, booking, payments, gift cards, packages, and related tools to businesses (\u201cBusiness Customers\u201d) and their clients (\u201cEnd Customers\u201d). This policy applies to both groups, though some sections are more relevant to one than the other.",
        },
        {
          type: "paragraph",
          text: "When a Business Customer uses Get Slot to manage bookings, that business is the controller of its clients\u2019 personal data, and Get Slot acts as a processor on its behalf. In those cases, the business\u2019s own privacy policy governs how it handles data, and this policy explains what Get Slot does as a platform provider.",
        },
      ],
    },
    {
      id: "information-we-collect",
      heading: "2. Information We Collect",
      blocks: [
        { type: "subheading", text: "Information you provide" },
        {
          type: "list",
          items: [
            "Account details such as your name, email address, phone number, business name, and password.",
            "Booking information including appointment times, services selected, notes, and preferences.",
            "Payment information processed through our payment partners. We do not store full card numbers on our own servers.",
            "Communications you send us, including support requests, feedback, and survey responses.",
          ],
        },
        { type: "subheading", text: "Information collected automatically" },
        {
          type: "list",
          items: [
            "Device and usage data such as IP address, browser type, operating system, pages viewed, and referring URLs.",
            "Cookies and similar technologies used to keep you signed in, remember preferences, and measure performance.",
            "Log data and diagnostics generated when you interact with the Services.",
          ],
        },
        { type: "subheading", text: "Information from third parties" },
        {
          type: "paragraph",
          text: "We may receive information from authentication providers, payment processors, calendar integrations, and analytics providers to operate and improve the Services.",
        },
      ],
    },
    {
      id: "how-we-use",
      heading: "3. How We Use Your Information",
      blocks: [
        {
          type: "list",
          items: [
            "Provide, operate, and maintain the Services, including scheduling, reminders, and payments.",
            "Authenticate users, secure accounts, and prevent fraud or abuse.",
            "Send transactional messages such as booking confirmations, reminders, and receipts.",
            "Send administrative and, where permitted, marketing communications that you can opt out of.",
            "Analyze usage to improve features, performance, and user experience.",
            "Comply with legal obligations and enforce our agreements.",
          ],
        },
      ],
    },
    {
      id: "legal-bases",
      heading: "4. Legal Bases for Processing",
      blocks: [
        {
          type: "paragraph",
          text: "Where the GDPR or similar laws apply, we process personal data on the following legal bases: performance of a contract (to deliver the Services you request), legitimate interests (to secure and improve the Services), consent (for optional marketing and certain cookies), and compliance with legal obligations.",
        },
      ],
    },
    {
      id: "how-we-share",
      heading: "5. How We Share Information",
      blocks: [
        { type: "paragraph", text: "We do not sell your personal information. We share it only in the following circumstances:" },
        {
          type: "list",
          items: [
            "With Business Customers whose services you book, so they can fulfill your appointment.",
            "With service providers who process data on our behalf, such as hosting, payments, email delivery, and analytics, under contractual confidentiality obligations.",
            "With integration partners you choose to connect, such as calendar or payment tools.",
            "For legal reasons, such as complying with a lawful request, protecting rights and safety, or investigating fraud.",
            "In connection with a merger, acquisition, or sale of assets, subject to the protections in this policy.",
          ],
        },
      ],
    },
    {
      id: "cookies",
      heading: "6. Cookies and Tracking",
      blocks: [
        {
          type: "paragraph",
          text: "We use cookies and similar technologies to keep you signed in, remember your preferences, and understand how the Services are used. You can control cookies through your browser settings. Blocking some cookies may affect how the Services function.",
        },
      ],
    },
    {
      id: "data-retention",
      heading: "7. Data Retention",
      blocks: [
        {
          type: "paragraph",
          text: "We retain personal information for as long as your account is active or as needed to provide the Services, comply with legal obligations, resolve disputes, and enforce agreements. When data is no longer required, we delete or anonymize it.",
        },
      ],
    },
    {
      id: "security",
      heading: "8. Data Security",
      blocks: [
        {
          type: "paragraph",
          text: "We use administrative, technical, and physical safeguards designed to protect your information, including encryption in transit, access controls, and monitoring. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.",
        },
      ],
    },
    {
      id: "your-rights",
      heading: "9. Your Rights and Choices",
      blocks: [
        {
          type: "paragraph",
          text: "Depending on where you live, you may have rights to access, correct, delete, or export your personal data, to object to or restrict certain processing, and to withdraw consent. You may also opt out of marketing communications at any time.",
        },
        {
          type: "paragraph",
          text: "To exercise these rights, contact us using the details below. If your data is managed by a Business Customer, we may direct your request to that business as the data controller.",
        },
      ],
    },
    {
      id: "international",
      heading: "10. International Transfers",
      blocks: [
        {
          type: "paragraph",
          text: "We may process and store information in countries other than where you live. When we transfer personal data across borders, we use appropriate safeguards such as standard contractual clauses to protect it.",
        },
      ],
    },
    {
      id: "children",
      heading: "11. Children\u2019s Privacy",
      blocks: [
        {
          type: "paragraph",
          text: "The Services are not directed to children under 16, and we do not knowingly collect personal information from them. If you believe a child has provided us information, please contact us so we can delete it.",
        },
      ],
    },
    {
      id: "changes",
      heading: "12. Changes to This Policy",
      blocks: [
        {
          type: "paragraph",
          text: "We may update this Privacy Policy from time to time. When we make material changes, we will update the effective date and, where appropriate, notify you. Your continued use of the Services after changes take effect means you accept the revised policy.",
        },
      ],
    },
  ],
  contact: {
    heading: "Questions about your privacy?",
    text: "If you have questions about this Privacy Policy or how we handle your information, we\u2019re happy to help. Reach out to our privacy team.",
    email: SUPPORT_EMAIL,
  },
};

export default function PrivacyPolicyPage() {
  return <LegalPage doc={doc} />;
}
