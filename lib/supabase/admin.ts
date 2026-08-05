import "server-only";
import { createClient } from "@supabase/supabase-js";
import { clientEnvironment } from "@/lib/environment/client";
import { serverEnvironment } from "@/lib/environment/server";
import type { Database } from "./database.types";

/**
 * Creates an administrative Supabase client that bypasses Row Level Security.
 *
 * WARNING: This client uses the service-role key and has unrestricted access
 * to the database. Use it only for:
 *   - Platform administration operations
 *   - Background jobs
 *   - Operations that cannot be performed through RLS policies
 *
 * NEVER:
 *   - Import this module from Client Components
 *   - Use it for normal user queries
 *   - Use it merely to avoid fixing RLS policies
 *   - Log or expose the service-role key
 */
export function createAdminClient() {
    const serviceRoleKey = serverEnvironment.supabaseServiceRoleKey;

    if (!serviceRoleKey) {
        throw new Error(
            "SUPABASE_SERVICE_ROLE_KEY is not configured. " +
            "The admin client requires the service-role key to operate. " +
            "Set SUPABASE_SERVICE_ROLE_KEY in your environment variables."
        );
    }

    return createClient<Database>(
        clientEnvironment.supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        }
    );
}
