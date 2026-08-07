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

function getOptionalEnv(name: string): string | null {
     const value = process.env[name]?.trim();
     return value ? value : null;
}

function getFirstNonEmptyEnv(names: string[]): string | null {
     for (const name of names) {
          const value = process.env[name]?.trim();
          if (value) return value;
     }
     return null;
}

export function getPolarEnvironment(): PolarEnvironment {
     const processorSecret = "";

     const syncSecret = getFirstNonEmptyEnv([
          "POLAR_RECONCILIATION_SECRET",
     ]) ?? "";

     return {
          apiBaseUrl: normalizeBaseUrl(process.env.POLAR_API_BASE_URL),
          accessToken: getOptionalEnv("POLAR_ACCESS_TOKEN") ?? "",
          organizationId: process.env.POLAR_ORGANIZATION_ID?.trim() || null,
          webhookSecret: getOptionalEnv("POLAR_WEBHOOK_SECRET") ?? "",
          processorSecret,
          syncSecret,
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
     const processorSecret = "";
     const syncSecret = getFirstNonEmptyEnv([
          "POLAR_RECONCILIATION_SECRET",
     ]);

     return {
          apiBaseUrl: baseUrl,
          hasAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
          hasOrganizationId: Boolean(process.env.POLAR_ORGANIZATION_ID?.trim()),
          hasWebhookSecret: Boolean(process.env.POLAR_WEBHOOK_SECRET?.trim()),
          hasProcessorSecret: Boolean(processorSecret),
          hasSyncSecret: Boolean(syncSecret),
     };
}
