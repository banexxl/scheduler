import "server-only";
import * as yup from "yup";

const serverEnvironmentSchema = yup.object({
  supabaseServiceRoleKey: yup.string().optional().default(""),
  supabaseProjectId: yup.string().optional().default(""),
});

export type ServerEnvironment = yup.InferType<typeof serverEnvironmentSchema>;

function validateServerEnvironment(): ServerEnvironment {
  try {
    return serverEnvironmentSchema.validateSync({
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseProjectId: process.env.SUPABASE_PROJECT_ID,
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
