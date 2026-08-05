import { createBrowserClient } from "@supabase/ssr";
import { clientEnvironment } from "@/lib/environment/client";
import type { Database } from "./database.types";

export function createClient() {
    return createBrowserClient<Database>(
        clientEnvironment.supabaseUrl,
        clientEnvironment.supabasePublishableKey
    );
}
