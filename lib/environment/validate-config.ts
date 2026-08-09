import "server-only";

/**
 * Configuration Validation — Milestone 10.3.
 *
 * Validates required environment variables at startup/import time.
 * Does NOT crash the process for optional/feature-dependent configs.
 * Logs warnings for missing optional configs.
 */

import { logger } from "@/lib/logging";

// ─── Required Configuration ──────────────────────────────────────────────────

export type ConfigValidationResult = {
  valid: boolean;
  missing: string[];
  warnings: string[];
};

const ALWAYS_REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const FEATURE_CONFIGS: Record<string, { envs: string[]; feature: string }> = {
  notifications: {
    envs: ["NOTIFICATION_PROCESSOR_SECRET", "NOTIFICATION_FROM_EMAIL"],
    feature: "Email notifications",
  },
  smtp: {
    envs: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"],
    feature: "SMTP delivery (when EMAIL_PROVIDER=nodemailer)",
  },
  polar: {
    envs: ["POLAR_ACCESS_TOKEN", "POLAR_WEBHOOK_SECRET"],
    feature: "Polar billing integration",
  },
  tokenEncryption: {
    envs: ["APPOINTMENT_TOKEN_ENCRYPTION_KEY"],
    feature: "Appointment self-service tokens",
  },
};

/**
 * Validates required environment configuration.
 * Call at application startup or in diagnostics routes.
 */
export function validateConfiguration(): ConfigValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check always-required
  for (const envVar of ALWAYS_REQUIRED) {
    if (!process.env[envVar]?.trim()) {
      missing.push(envVar);
    }
  }

  // Check feature-dependent (warn only)
  for (const [_, config] of Object.entries(FEATURE_CONFIGS)) {
    const featureMissing = config.envs.filter((e) => !process.env[e]?.trim());
    if (featureMissing.length > 0 && featureMissing.length < config.envs.length) {
      // Partially configured — warn
      warnings.push(
        `${config.feature}: partially configured (missing ${featureMissing.join(", ")})`
      );
    }
  }

  // Special case: nodemailer needs SMTP vars
  if (process.env.EMAIL_PROVIDER === "nodemailer") {
    const smtpConfig = FEATURE_CONFIGS.smtp;
    if (smtpConfig) {
      const smtpMissing = smtpConfig.envs.filter((e) => !process.env[e]?.trim());
      if (smtpMissing.length > 0) {
        warnings.push(`SMTP: EMAIL_PROVIDER=nodemailer but missing ${smtpMissing.join(", ")}`);
      }
    }
  }

  const valid = missing.length === 0;

  if (!valid) {
    logger.error("config_validation_failed", {
      operation: "startup",
      errorCategory: "CONFIGURATION",
    });
  }

  if (warnings.length > 0) {
    logger.warn("config_validation_warnings", {
      operation: "startup",
    });
  }

  return { valid, missing, warnings };
}

/**
 * Returns feature availability based on current config.
 * Safe to expose in diagnostics (no secret values).
 */
export function getFeatureAvailability(): Record<string, boolean> {
  return {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    emailNotifications: Boolean(process.env.NOTIFICATION_PROCESSOR_SECRET),
    smtpDelivery: process.env.EMAIL_PROVIDER === "nodemailer" && Boolean(process.env.SMTP_HOST),
    polarBilling: Boolean(process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_WEBHOOK_SECRET),
    appointmentSelfService: Boolean(process.env.APPOINTMENT_TOKEN_ENCRYPTION_KEY),
  };
}
