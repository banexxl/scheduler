import "server-only";
import * as yup from "yup";

const serverEnvironmentSchema = yup.object({
  supabaseServiceRoleKey: yup.string().optional().default(""),
  supabaseProjectId: yup.string().optional().default(""),
  polarApiBaseUrl: yup.string().optional().default("https://api.polar.sh"),
  polarAccessToken: yup.string().optional().default(""),
  polarOrganizationId: yup.string().optional().default(""),
  polarWebhookSecret: yup.string().optional().default(""),
  billingProcessorSecret: yup.string().optional().default(""),
  billingSyncSecret: yup.string().optional().default(""),
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
      billingProcessorSecret: process.env.BILLING_PROCESSOR_SECRET,
      billingSyncSecret: process.env.BILLING_SYNC_SECRET,
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
