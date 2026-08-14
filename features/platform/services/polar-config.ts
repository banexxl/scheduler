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
 * Resolves the correct env var based on POLAR_SERVER mode.
 *
 * When POLAR_SERVER=sandbox:
 *   Looks for SANDBOX_POLAR_ACCESS_TOKEN first, falls back to POLAR_ACCESS_TOKEN
 * When POLAR_SERVER=production (or unset):
 *   Uses POLAR_ACCESS_TOKEN directly
 *
 * This allows the same codebase to run against sandbox (localhost, preview)
 * and production (main branch) by prefixing sandbox vars with SANDBOX_.
 */
function isSandbox(): boolean {
     return (process.env.POLAR_SERVER?.trim().toLowerCase() ?? "production") === "sandbox";
}

function getPolarEnv(name: string): string | null {
     const sandbox = isSandbox();
     if (sandbox) {
          // Try SANDBOX_ prefixed first, fall back to unprefixed
          const sandboxValue = process.env[`SANDBOX_${name}`]?.trim();
          if (sandboxValue) return sandboxValue;
     }
     const value = process.env[name]?.trim();
     return value || null;
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

export function getPolarEnvironment(): PolarEnvironment {
     const processorSecret = "";

     const syncSecret = getPolarEnv("POLAR_RECONCILIATION_SECRET") ?? "";

     return {
          apiBaseUrl: normalizeBaseUrl(getPolarEnv("POLAR_API_BASE_URL")),
          accessToken: getPolarEnv("POLAR_ACCESS_TOKEN") ?? "",
          organizationId: getPolarEnv("POLAR_ORGANIZATION_ID") ?? null,
          webhookSecret: getPolarEnv("POLAR_WEBHOOK_SECRET") ?? "",
          processorSecret,
          syncSecret,
     };
}

/**
 * Resolves a per-webhook secret with sandbox prefix support.
 * Example: getPolarWebhookSecret("ORDER") checks:
 *   sandbox → SANDBOX_POLAR_ORDER_WEBHOOK_SECRET → POLAR_ORDER_WEBHOOK_SECRET → general webhook secret
 *   prod    → POLAR_ORDER_WEBHOOK_SECRET → general webhook secret
 */
export function getPolarWebhookSecret(type: string): string {
     return getPolarEnv(`POLAR_${type}_WEBHOOK_SECRET`) ?? getPolarEnv("POLAR_WEBHOOK_SECRET") ?? "";
}

export function getBillingProcessorSecret(): string {
     return getPolarEnvironment().processorSecret;
}

export function getBillingSyncSecret(): string {
     return getPolarEnvironment().syncSecret;
}

export function getBillingDiagnosticsConfig() {
     const env = getPolarEnvironment();

     return {
          apiBaseUrl: env.apiBaseUrl,
          server: isSandbox() ? "sandbox" : "production",
          hasAccessToken: Boolean(env.accessToken),
          hasOrganizationId: Boolean(env.organizationId),
          hasWebhookSecret: Boolean(env.webhookSecret),
          hasProcessorSecret: Boolean(env.processorSecret),
          hasSyncSecret: Boolean(env.syncSecret),
     };
}
