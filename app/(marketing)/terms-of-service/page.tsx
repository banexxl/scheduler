import LegalPage, { type LegalDocument } from "@/features/marketing/components/legal-page";

export const metadata = {
  title: "Terms of Service — Get Slot",
  description:
    "The terms and conditions that govern your use of the Get Slot online scheduling platform and related services.",
  openGraph: {
    title: "Terms of Service — Get Slot",
    description: "The terms and conditions that govern your use of Get Slot.",
    type: "website",
  },
};

const EFFECTIVE_DATE = "September 1, 2026";
const SUPPORT_EMAIL = "legal@getslot.com";

const doc: LegalDocument = {
  eyebrow: "Legal",
  title: "Terms of Service",
  effectiveDate: EFFECTIVE_DATE,
  intro:
    "These Terms of Service (\u201cTerms\u201d) form a binding agreement between you and Get Slot (\u201cGet Slot,\u201d \u201cwe,\u201d \u201cus,\u201d or \u201cour\u201d) and govern your access to and use of our online scheduling platform, websites, and related services (collectively, the \u201cServices\u201d). By creating an account or using the Services, you agree to these Terms. If you do not agree, do not use the Services.",
  sections: [
    {
      id: "acceptance",
      heading: "1. Acceptance of Terms",
      blocks: [
        {
          type: "paragraph",
          text: "By accessing or using the Services, you confirm that you can form a binding contract, that you are at least 18 years old or the age of majority in your jurisdiction, and that you accept these Terms. If you use the Services on behalf of an organization, you represent that you are authorized to bind that organization to these Terms.",
        },
      ],
    },
    {
      id: "description",
      heading: "2. Description of the Services",
      blocks: [
        {
          type: "paragraph",
          text: "Get Slot provides tools for scheduling and managing appointments, bookings, payments, gift cards, packages, and recurring appointments. We may add, change, or remove features over time to improve the Services.",
        },
      ],
    },
    {
      id: "accounts",
      heading: "3. Accounts and Registration",
      blocks: [
        {
          type: "list",
          items: [
            "You must provide accurate, current, and complete information when registering.",
            "You are responsible for maintaining the confidentiality of your login credentials.",
            "You are responsible for all activity that occurs under your account.",
            "Notify us promptly if you suspect any unauthorized use of your account.",
          ],
        },
      ],
    },
    {
      id: "acceptable-use",
      heading: "4. Acceptable Use",
      blocks: [
        { type: "paragraph", text: "You agree not to use the Services to:" },
        {
          type: "list",
          items: [
            "Violate any applicable law or regulation, or infringe the rights of others.",
            "Upload malicious code or attempt to disrupt or compromise the Services.",
            "Access the Services through automated means without our permission, or attempt to circumvent security or usage limits.",
            "Send spam, unsolicited messages, or fraudulent communications.",
            "Reverse engineer, resell, or misuse the Services beyond what these Terms allow.",
          ],
        },
      ],
    },
    {
      id: "billing",
      heading: "5. Plans, Billing, and Trials",
      blocks: [
        {
          type: "paragraph",
          text: "Some features require a paid subscription. Fees, billing intervals, and plan details are shown at the time of purchase. Paid plans may include a free trial; unless you cancel before the trial ends, the plan converts to a paid subscription.",
        },
        {
          type: "list",
          items: [
            "Subscriptions renew automatically at the end of each billing period unless canceled.",
            "You authorize us and our payment partners to charge your payment method for applicable fees and taxes.",
            "Fees are generally non-refundable except where required by law or expressly stated.",
            "We may change pricing with reasonable advance notice; changes apply to the next billing cycle.",
          ],
        },
      ],
    },
    {
      id: "payments-end-customers",
      heading: "6. Payments Between Businesses and Customers",
      blocks: [
        {
          type: "paragraph",
          text: "Where Business Customers accept payments through the Services, those transactions are between the business and its End Customers. Get Slot provides the platform and payment facilitation but is not a party to those transactions and is not responsible for the underlying goods or services, refunds, or disputes, which are handled by the business.",
        },
      ],
    },
    {
      id: "content",
      heading: "7. Your Content",
      blocks: [
        {
          type: "paragraph",
          text: "You retain ownership of the content you submit to the Services. You grant us a limited, non-exclusive license to host, process, and display that content solely to provide and improve the Services. You are responsible for ensuring you have the rights to any content you submit.",
        },
      ],
    },
    {
      id: "intellectual-property",
      heading: "8. Intellectual Property",
      blocks: [
        {
          type: "paragraph",
          text: "The Services, including software, design, and trademarks, are owned by Get Slot or its licensors and are protected by intellectual property laws. Except for the rights expressly granted to you, we reserve all rights. You may not copy, modify, or create derivative works from the Services without our permission.",
        },
      ],
    },
    {
      id: "third-party",
      heading: "9. Third-Party Services",
      blocks: [
        {
          type: "paragraph",
          text: "The Services may integrate with third-party products such as payment processors and calendars. Your use of those products is governed by their own terms and privacy policies. We are not responsible for third-party services and do not endorse them.",
        },
      ],
    },
    {
      id: "termination",
      heading: "10. Suspension and Termination",
      blocks: [
        {
          type: "paragraph",
          text: "You may stop using the Services at any time. We may suspend or terminate your access if you violate these Terms, fail to pay applicable fees, or where necessary to protect the Services or other users. Upon termination, your right to use the Services ends, though certain provisions survive as described below.",
        },
      ],
    },
    {
      id: "disclaimers",
      heading: "11. Disclaimers",
      blocks: [
        {
          type: "paragraph",
          text: "The Services are provided \u201cas is\u201d and \u201cas available\u201d without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Services will be uninterrupted, error-free, or completely secure.",
        },
      ],
    },
    {
      id: "liability",
      heading: "12. Limitation of Liability",
      blocks: [
        {
          type: "paragraph",
          text: "To the maximum extent permitted by law, Get Slot will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenues, data, or goodwill. Our total liability for any claim relating to the Services will not exceed the amounts you paid us in the twelve months before the event giving rise to the claim.",
        },
      ],
    },
    {
      id: "indemnification",
      heading: "13. Indemnification",
      blocks: [
        {
          type: "paragraph",
          text: "You agree to indemnify and hold harmless Get Slot and its affiliates from any claims, damages, and expenses arising out of your use of the Services, your content, or your violation of these Terms or applicable law.",
        },
      ],
    },
    {
      id: "governing-law",
      heading: "14. Governing Law and Disputes",
      blocks: [
        {
          type: "paragraph",
          text: "These Terms are governed by the laws of the jurisdiction in which Get Slot operates, without regard to conflict-of-law rules. Any disputes will be resolved in the courts of that jurisdiction, unless applicable law requires otherwise.",
        },
      ],
    },
    {
      id: "changes",
      heading: "15. Changes to These Terms",
      blocks: [
        {
          type: "paragraph",
          text: "We may update these Terms from time to time. When we make material changes, we will update the effective date and, where appropriate, notify you. Your continued use of the Services after the changes take effect means you accept the revised Terms.",
        },
      ],
    },
  ],
  contact: {
    heading: "Questions about these Terms?",
    text: "If you have questions about these Terms of Service, our legal team is here to help.",
    email: SUPPORT_EMAIL,
  },
};

export default function TermsOfServicePage() {
  return <LegalPage doc={doc} />;
}
