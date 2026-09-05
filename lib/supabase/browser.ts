import { createBrowserClient } from "@supabase/ssr";
import { clientEnvironment } from "@/lib/environment/client";
import type { Database } from "./database.types";

export function createClient() {
    return createBrowserClient<Database>(
        clientEnvironment.supabaseUrl,
        clientEnvironment.supabasePublishableKey,
        {
            // Match the server client's flow type. auth-js defaults to the
            // implicit flow (tokens in the URL hash); we use PKCE so all auth
            // flows produce `?code=` links handled by /api/auth/callback.
            auth: {
                flowType: "pkce",
            },
        }
    );
}
