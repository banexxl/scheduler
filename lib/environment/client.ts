import * as yup from "yup";

const clientEnvironmentSchema = yup.object({
  supabaseUrl: yup
    .string()
    .required("NEXT_PUBLIC_SUPABASE_URL is required")
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  supabasePublishableKey: yup
    .string()
    .required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required")
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must not be empty"),
  appName: yup
    .string()
    .required("NEXT_PUBLIC_APP_NAME is required")
    .min(1, "NEXT_PUBLIC_APP_NAME must not be empty"),
  appUrl: yup
    .string()
    .required("NEXT_PUBLIC_APP_URL is required")
    .test(
      "is-http-url",
      "NEXT_PUBLIC_APP_URL must be a valid HTTP or HTTPS URL",
      (value) => {
        if (!value) return false;
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      }
    )
    .transform((value: string) => value?.replace(/\/$/, "")),
  rootDomain: yup
    .string()
    .required("NEXT_PUBLIC_ROOT_DOMAIN is required")
    .min(1, "NEXT_PUBLIC_ROOT_DOMAIN must not be empty"),
});

export type ClientEnvironment = yup.InferType<typeof clientEnvironmentSchema>;

let _cached: ClientEnvironment | null = null;

/**
 * Returns the validated client environment.
 * Validation runs lazily on first access and is cached thereafter.
 * This avoids build-time failures when environment variables are
 * not available during static page generation.
 */
function getClientEnvironment(): ClientEnvironment {
  if (_cached) return _cached;

  try {
    _cached = clientEnvironmentSchema.validateSync({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabasePublishableKey:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      appName: process.env.NEXT_PUBLIC_APP_NAME,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    });
    return _cached;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      throw new Error(
        `Client environment validation failed: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Lazily validated client environment.
 * Access any property to trigger validation on first use.
 */
export const clientEnvironment: ClientEnvironment = new Proxy(
  {} as ClientEnvironment,
  {
    get(_target, prop: string) {
      return getClientEnvironment()[prop as keyof ClientEnvironment];
    },
  }
);
