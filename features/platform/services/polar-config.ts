import "server-only";

type PolarEnvironment = {
     apiBaseUrl: string;
     accessToken: string;
     organizationId: string | null;
     webhookSecret: string;
     processorSecret: string;
     syncSecret: string;
};

/**
 * Determines if running against Polar sandbox.
 * POLAR_SERVER=sandbox → sandbox; anything else → production.
 */
function isSandbox(): boolean {
     return (process.env.POLAR_SERVER?.trim().toLowerCase() ?? "production") === "sandbox";
}

function normalizeBaseUrl(value: string | undefined | null): string {
     const sandbox = isSandbox();
     const fallback = sandbox ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
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
     return value || null;
}

export function getPolarEnvironment(): PolarEnvironment {
     return {
          apiBaseUrl: normalizeBaseUrl(process.env.POLAR_API_BASE_URL),
          accessToken: getOptionalEnv("POLAR_ACCESS_TOKEN") ?? "",
          organizationId: getOptionalEnv("POLAR_ORGANIZATION_ID") ?? null,
          webhookSecret: getOptionalEnv("POLAR_WEBHOOK_SECRET") ?? "",
          processorSecret: "",
          syncSecret: getOptionalEnv("POLAR_RECONCILIATION_SECRET") ?? "",
     };
}

/**
 * Resolves a per-webhook secret.
 * Example: getPolarWebhookSecret("ORDER") → POLAR_ORDER_WEBHOOK_SECRET → POLAR_WEBHOOK_SECRET
 */
export function getPolarWebhookSecret(type: string): string {
     return getOptionalEnv(`POLAR_${type}_WEBHOOK_SECRET`) ?? getOptionalEnv("POLAR_WEBHOOK_SECRET") ?? "";
}

export function getBillingProcessorSecret(): string {
     return getPolarEnvironment().processorSecret;
}

export function getBillingSyncSecret(): string {
     return getPolarEnvironment().syncSecret;
}

export function getBillingDiagnosticsConfig() {
     const env = getPolarEnvironment();

     // Check if any webhook secret is configured
     const hasAnyWebhookSecret = Boolean(
          env.webhookSecret ||
          getOptionalEnv("POLAR_ORDER_WEBHOOK_SECRET") ||
          getOptionalEnv("POLAR_CHECKOUT_WEBHOOK_SECRET") ||
          getOptionalEnv("POLAR_SUBSCRIPTION_WEBHOOK_SECRET")
     );

     return {
          apiBaseUrl: env.apiBaseUrl,
          server: isSandbox() ? "sandbox" : "production",
          hasAccessToken: Boolean(env.accessToken),
          hasOrganizationId: Boolean(env.organizationId),
          hasWebhookSecret: hasAnyWebhookSecret,
          hasProcessorSecret: Boolean(env.processorSecret),
          hasSyncSecret: Boolean(env.syncSecret),
     };
}
