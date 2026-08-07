import "server-only";
import * as yup from "yup";

const serverEnvironmentSchema = yup.object({
  supabaseServiceRoleKey: yup.string().optional().default(""),
  supabaseProjectId: yup.string().optional().default(""),
  polarApiBaseUrl: yup.string().optional().default("https://api.polar.sh"),
  polarAccessToken: yup.string().optional().default(""),
  polarOrganizationId: yup.string().optional().default(""),
  polarWebhookSecret: yup.string().optional().default(""),
  polarServer: yup.string().optional().default("sandbox"),
  polarReconciliationSecret: yup.string().optional().default(""),
});

export type ServerEnvironment = yup.InferType<typeof serverEnvironmentSchema>;

function validateServerEnvironment(): ServerEnvironment {
  try {
    return serverEnvironmentSchema.validateSync({
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseProjectId: process.env.SUPABASE_PROJECT_ID,
      polarApiBaseUrl: process.env.POLAR_API_BASE_URL,
      polarAccessToken: process.env.POLAR_ACCESS_TOKEN,
      polarOrganizationId: process.env.POLAR_ORGANIZATION_ID,
      polarWebhookSecret: process.env.POLAR_WEBHOOK_SECRET,
      polarServer: process.env.POLAR_SERVER,
      polarReconciliationSecret: process.env.POLAR_RECONCILIATION_SECRET,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      throw new Error(
        `Server environment validation failed: ${error.message}`
      );
    }
    throw error;
  }
}

export const serverEnvironment = validateServerEnvironment();
