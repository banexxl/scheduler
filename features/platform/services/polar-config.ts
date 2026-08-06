import "server-only";

type PolarEnvironment = {
     apiBaseUrl: string;
     accessToken: string;
     organizationId: string | null;
     webhookSecret: string;
     processorSecret: string;
     syncSecret: string;
};

function normalizeBaseUrl(value: string | undefined): string {
     const fallback = "https://api.polar.sh";
     const input = value?.trim();
     if (!input) return fallback;

     try {
          const url = new URL(input);
          return `${url.protocol}//${url.host}`;
     } catch {
          throw new Error("POLAR_API_BASE_URL must be a valid URL");
     }
}

function getRequiredEnv(name: string): string {
     const value = process.env[name]?.trim();
     if (!value) {
          throw new Error(`${name} is required for billing operations`);
     }
     return value;
}

export function getPolarEnvironment(): PolarEnvironment {
     return {
          apiBaseUrl: normalizeBaseUrl(process.env.POLAR_API_BASE_URL),
          accessToken: getRequiredEnv("POLAR_ACCESS_TOKEN"),
          organizationId: process.env.POLAR_ORGANIZATION_ID?.trim() || null,
          webhookSecret: getRequiredEnv("POLAR_WEBHOOK_SECRET"),
          processorSecret: getRequiredEnv("BILLING_PROCESSOR_SECRET"),
          syncSecret:
               process.env.BILLING_SYNC_SECRET?.trim() ||
               getRequiredEnv("BILLING_PROCESSOR_SECRET"),
     };
}

export function getBillingProcessorSecret(): string {
     return getPolarEnvironment().processorSecret;
}

export function getBillingSyncSecret(): string {
     return getPolarEnvironment().syncSecret;
}

export function getBillingDiagnosticsConfig() {
     const baseUrl = normalizeBaseUrl(process.env.POLAR_API_BASE_URL);
     return {
          apiBaseUrl: baseUrl,
          hasAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
          hasOrganizationId: Boolean(process.env.POLAR_ORGANIZATION_ID?.trim()),
          hasWebhookSecret: Boolean(process.env.POLAR_WEBHOOK_SECRET?.trim()),
          hasProcessorSecret: Boolean(process.env.BILLING_PROCESSOR_SECRET?.trim()),
          hasSyncSecret: Boolean(
               process.env.BILLING_SYNC_SECRET?.trim() ||
               process.env.BILLING_PROCESSOR_SECRET?.trim()
          ),
     };
}
